"""The user's saved app state (grid settings, schedule title, theme, ...), restored on any device they sign in from."""

import json
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_owner
from app.db import connect

router = APIRouter(prefix="/state", tags=["state"])

MAX_STATE_BYTES = 64 * 1024


class AppState(BaseModel):
    data: dict[str, Any]
    updated_at: float | None = None


class AppStateUpdate(BaseModel):
    data: dict[str, Any]


def _load(conn, owner: str) -> AppState:
    row = conn.execute("SELECT data, updated_at FROM app_state WHERE owner = ?", (owner,)).fetchone()
    if row is None:
        return AppState(data={})
    return AppState(data=json.loads(row["data"]), updated_at=row["updated_at"])


@router.get("", response_model=AppState)
def get_state(owner: str = Depends(get_owner)):
    with connect() as conn:
        return _load(conn, owner)


@router.patch("", response_model=AppState)
def update_state(payload: AppStateUpdate, owner: str = Depends(get_owner)):
    """Shallow-merge the given keys into the saved state; keys not sent are kept."""
    with connect() as conn:
        merged = {**_load(conn, owner).data, **payload.data}
        raw = json.dumps(merged, separators=(",", ":"))
        if len(raw.encode()) > MAX_STATE_BYTES:
            raise HTTPException(status_code=413, detail="Saved state is too large.")
        now = time.time()
        conn.execute(
            """
            INSERT INTO app_state (owner, data, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(owner) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
            """,
            (owner, raw, now),
        )
    return AppState(data=merged, updated_at=now)
