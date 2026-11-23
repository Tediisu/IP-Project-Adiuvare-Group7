"""Server-side sessions and the per-request data owner."""

import hashlib
import os
import re
import secrets
import time

from fastapi import Request, Response

from app.db import connect

SESSION_COOKIE = "adiuvare_session"
GUEST_COOKIE = "adiuvare_guest"
SESSION_MAX_AGE = 60 * 60 * 24 * 30  # 30 days
GUEST_MAX_AGE = 60 * 60 * 24 * 365
COOKIE_SECURE = os.getenv("FRONTEND_URL", "http://localhost:5173").startswith("https://")

_GUEST_ID = re.compile(r"^[A-Za-z0-9_-]{32,64}$")


def _hash(token: str) -> str:
    # Only the hash is stored, so a leaked database does not hand out live session cookies.
    return hashlib.sha256(token.encode()).hexdigest()


def upsert_user(user_id: str, name: str, email: str | None) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name
            """,
            (user_id, email, name, time.time()),
        )


def create_session(user_id: str, access_token: str, refresh_token: str | None, expires_at: float) -> str:
    token = secrets.token_urlsafe(32)
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions (id, user_id, access_token, refresh_token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (_hash(token), user_id, access_token, refresh_token, expires_at, time.time()),
        )
    return token


def get_session(token: str | None) -> dict | None:
    """The session and its user's profile, or None when the cookie is missing, unknown or expired."""
    if not token:
        return None
    with connect() as conn:
        row = conn.execute(
            """
            SELECT s.id, s.user_id, s.access_token, s.refresh_token, s.expires_at, s.created_at,
                   u.name, u.email
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.id = ?
            """,
            (_hash(token),),
        ).fetchone()
        if row is None:
            return None
        if row["created_at"] + SESSION_MAX_AGE < time.time():
            conn.execute("DELETE FROM sessions WHERE id = ?", (row["id"],))
            return None
    return dict(row)


def update_access_token(session: dict, access_token: str, expires_at: float) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE sessions SET access_token = ?, expires_at = ? WHERE id = ?",
            (access_token, expires_at, session["id"]),
        )


def delete_session(token: str | None) -> None:
    if not token:
        return
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (_hash(token),))


def adopt_guest_data(guest_id: str | None, user_id: str) -> None:
    """Carry a guest's schedule into the account they just signed in to.

    Only fills an empty account, so signing in on a shared computer never mixes a guest's
    classes into an existing schedule or overwrites the account's saved settings.
    """
    if not guest_id or not _GUEST_ID.match(guest_id):
        return
    guest, user = f"guest:{guest_id}", f"user:{user_id}"
    with connect() as conn:
        if conn.execute("SELECT 1 FROM items WHERE owner = ? LIMIT 1", (user,)).fetchone() is None:
            conn.execute("UPDATE items SET owner = ? WHERE owner = ?", (user, guest))
        conn.execute(
            """
            INSERT OR IGNORE INTO app_state (owner, data, updated_at)
            SELECT ?, data, updated_at FROM app_state WHERE owner = ?
            """,
            (user, guest),
        )


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_MAX_AGE,
        secure=COOKIE_SECURE,
    )


def get_owner(request: Request, response: Response) -> str:
    """Whose data this request reads and writes.

    Signed-in users own their data by Google account, so it follows them to any device.
    Guests get a random id cookie, so their data stays private to this browser.
    """
    session = get_session(request.cookies.get(SESSION_COOKIE))
    if session:
        return f"user:{session['user_id']}"

    guest_id = request.cookies.get(GUEST_COOKIE)
    if not guest_id or not _GUEST_ID.match(guest_id):
        guest_id = secrets.token_urlsafe(32)
        response.set_cookie(
            key=GUEST_COOKIE,
            value=guest_id,
            httponly=True,
            samesite="lax",
            max_age=GUEST_MAX_AGE,
            secure=COOKIE_SECURE,
        )
    return f"guest:{guest_id}"
