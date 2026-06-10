"""Temporary import sessions for CLI-to-browser project handoff."""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

from pydantic import TypeAdapter, ValidationError

IMPORT_SESSION_DIR = Path("/tmp/graphqomb-studio/imports")
IMPORT_SESSION_TTL_SECONDS = 24 * 60 * 60
PROJECT_ADAPTER = TypeAdapter(dict[str, Any])


def create_import_session(project: dict[str, Any]) -> str:
    """Persist a temporary project and return its opaque token."""
    cleanup_import_sessions()
    token = uuid.uuid4().hex
    IMPORT_SESSION_DIR.mkdir(parents=True, exist_ok=True)
    session_path = _session_path(token)
    session_path.write_text(json.dumps(project), encoding="utf-8")
    return token


def read_import_session(token: str) -> dict[str, Any]:
    """Read a previously persisted temporary project."""
    session_path = _session_path(token)
    if not session_path.exists():
        msg = "Import session not found"
        raise FileNotFoundError(msg)

    try:
        return PROJECT_ADAPTER.validate_json(session_path.read_text(encoding="utf-8"))
    except ValidationError as exc:
        msg = "Import session payload must be a JSON object"
        raise ValueError(msg) from exc


def cleanup_import_sessions(*, now: float | None = None) -> None:
    """Remove stale temporary import sessions."""
    if not IMPORT_SESSION_DIR.exists():
        return

    current_time = time.time() if now is None else now
    for session_path in IMPORT_SESSION_DIR.glob("*.json"):
        try:
            if current_time - session_path.stat().st_mtime > IMPORT_SESSION_TTL_SECONDS:
                session_path.unlink()
        except FileNotFoundError:
            continue


def _session_path(token: str) -> Path:
    _validate_token(token)
    return IMPORT_SESSION_DIR / f"{token}.json"


def _validate_token(token: str) -> None:
    try:
        parsed = uuid.UUID(hex=token)
    except ValueError as exc:
        msg = "Invalid import session token"
        raise ValueError(msg) from exc
    if parsed.hex != token:
        msg = "Invalid import session token"
        raise ValueError(msg)
