"""SQLite persistence so schedules, sessions and app state survive restarts and follow the user across devices."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(os.getenv("DATABASE_PATH", "data/adiuvare.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,          -- Google account id ("sub")
    email       TEXT,
    name        TEXT NOT NULL,
    created_at  REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id             TEXT PRIMARY KEY,       -- sha256 of the session cookie value
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token   TEXT,
    refresh_token  TEXT,
    expires_at     REAL NOT NULL DEFAULT 0,
    created_at     REAL NOT NULL
);

-- owner is "user:<google id>" for signed-in users or "guest:<cookie id>" for guests.
CREATE TABLE IF NOT EXISTS items (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    owner  TEXT NOT NULL,
    data   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS items_owner ON items(owner);

CREATE TABLE IF NOT EXISTS app_state (
    owner       TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    updated_at  REAL NOT NULL
);
"""


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """A connection that commits on success and rolls back on error."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)
