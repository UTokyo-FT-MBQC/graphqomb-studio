"""Import session API router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from src.services.import_sessions import read_import_session

router = APIRouter(prefix="/api", tags=["imports"])


@router.get("/import-session/{token}")
def get_import_session(token: str) -> JSONResponse:
    """Return a temporary project imported by the CLI."""
    try:
        project: dict[str, Any] = read_import_session(token)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Import session not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return JSONResponse(project)
