"""Import session API router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from src.services.import_sessions import create_import_session, read_import_session
from src.services.ptn_import import ptn_text_to_project

router = APIRouter(prefix="/api", tags=["imports"])


class PtnImportRequest(BaseModel):
    """Request body for importing PTN text from the browser."""

    model_config = ConfigDict(extra="forbid")

    text: str
    name: str = "Imported PTN"


@router.post("/import-session")
def create_import_session_endpoint(project: dict[str, Any]) -> dict[str, str]:
    """Create a temporary project import session."""
    token = create_import_session(project)
    return {"token": token}


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


@router.post("/import-ptn")
def import_ptn(request: PtnImportRequest) -> JSONResponse:
    """Convert PTN text into a Studio project."""
    try:
        project = ptn_text_to_project(request.text, name=request.name)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid PTN file: {exc}") from exc
    return JSONResponse(project)
