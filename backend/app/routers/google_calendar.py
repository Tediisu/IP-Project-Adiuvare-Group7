import json
import os
import secrets
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app import auth


router = APIRouter(tags=["google"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback",
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Short-lived OAuth state values; sessions themselves are stored in the database (app.auth).
_states: dict[str, float] = {}


class CalendarEntry(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    date: str
    start: str
    end: str
    repeatWeekly: bool = False
    timeZone: str | None = None


class CalendarImport(BaseModel):
    entries: list[CalendarEntry] = Field(min_length=1)


def _post_form(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode()
    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode())


def _get_json(url: str, access_token: str) -> dict:
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode())


def _configured() -> bool:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )


def _refresh_access_token(session: dict) -> str:
    if session.get("access_token") and time.time() < session.get("expires_at", 0) - 30:
        return session["access_token"]

    refresh_token = session.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Google authentication has expired. Sign in again.")

    result = _post_form(
        "https://oauth2.googleapis.com/token",
        {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
    )
    access_token = result.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Google could not refresh the session.")

    auth.update_access_token(session, access_token, time.time() + int(result.get("expires_in", 3600)))
    return access_token


@router.get("/auth/google/login")
def google_login():
    _configured()
    state = secrets.token_urlsafe(32)
    _states[state] = time.time() + 600
    query = urllib.parse.urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile https://www.googleapis.com/auth/calendar.events",
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")


@router.get("/auth/google/callback")
def google_callback(code: str, state: str, request: Request):
    _configured()
    expires_at = _states.pop(state, 0)
    if expires_at < time.time():
        raise HTTPException(status_code=400, detail="Invalid or expired Google OAuth state.")

    token_data = _post_form(
        "https://oauth2.googleapis.com/token",
        {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
    )
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Google did not return an access token.")

    profile = _get_json("https://openidconnect.googleapis.com/v1/userinfo", access_token)
    # Google's stable account id; the same on every device, so saved data follows the user.
    user_id = profile.get("sub") or profile.get("email")
    if not user_id:
        raise HTTPException(status_code=502, detail="Google did not return an account id.")

    auth.upsert_user(
        user_id,
        name=profile.get("name") or profile.get("email") or "Google User",
        email=profile.get("email"),
    )
    # A guest who signs in (e.g. from "Sync GCal") keeps the schedule they built.
    auth.adopt_guest_data(request.cookies.get(auth.GUEST_COOKIE), user_id)
    session_token = auth.create_session(
        user_id,
        access_token=access_token,
        refresh_token=token_data.get("refresh_token"),
        expires_at=time.time() + int(token_data.get("expires_in", 3600)),
    )

    redirect = RedirectResponse(f"{FRONTEND_URL}/dashboard?google=connected", status_code=302)
    auth.set_session_cookie(redirect, session_token)
    return redirect


@router.get("/auth/google/status")
def google_status(adiuvare_session: str | None = Cookie(default=None)):
    session = auth.get_session(adiuvare_session)
    if not session:
        return {"authenticated": False}
    return {"authenticated": True, "name": session["name"], "email": session["email"]}


@router.post("/auth/google/logout")
def google_logout(response: Response, adiuvare_session: str | None = Cookie(default=None)):
    auth.delete_session(adiuvare_session)
    response.delete_cookie(auth.SESSION_COOKIE)
    return {"authenticated": False}


@router.post("/google-calendar/import")
def import_google_calendar(
    payload: CalendarImport,
    adiuvare_session: str | None = Cookie(default=None),
):
    session = auth.get_session(adiuvare_session)
    if not session:
        raise HTTPException(status_code=401, detail="Sign in with Google before importing.")

    access_token = _refresh_access_token(session)
    created: list[dict] = []

    for entry in payload.entries:
        try:
            datetime.strptime(entry.date, "%Y-%m-%d")
            datetime.strptime(entry.start, "%H:%M")
            datetime.strptime(entry.end, "%H:%M")
        except ValueError:
            raise HTTPException(status_code=400, detail="Dates must use YYYY-MM-DD and times must use HH:MM.")

        event: dict = {
            "summary": entry.title,
            "start": {
                "dateTime": f"{entry.date}T{entry.start}:00",
                **({"timeZone": entry.timeZone} if entry.timeZone else {}),
            },
            "end": {
                "dateTime": f"{entry.date}T{entry.end}:00",
                **({"timeZone": entry.timeZone} if entry.timeZone else {}),
            },
        }
        if entry.repeatWeekly:
            event["recurrence"] = ["RRULE:FREQ=WEEKLY"]

        body = json.dumps(event).encode()
        request = urllib.request.Request(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                created.append(json.loads(response.read().decode()))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode()
            raise HTTPException(status_code=502, detail=f"Google Calendar rejected an event: {detail}")

    return {"created": len(created), "events": [event.get("htmlLink") for event in created]}
