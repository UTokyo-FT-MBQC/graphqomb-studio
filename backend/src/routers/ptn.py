"""PTN import/export API router.

POST /api/ptn/export - Export a Studio project to graphqomb PTN.
POST /api/ptn/import - Import graphqomb PTN as a Studio project.
"""

from fastapi import APIRouter, HTTPException

from src.models.dto import (
    PtnExportRequestDTO,
    PtnExportResponseDTO,
    PtnImportRequestDTO,
    PtnImportResponseDTO,
)
from src.services.ptn import project_to_ptn, ptn_to_project

router = APIRouter(prefix="/api/ptn", tags=["ptn"])


@router.post("/export", response_model=PtnExportResponseDTO)
def export_ptn(request: PtnExportRequestDTO) -> PtnExportResponseDTO:
    """Export a Studio project as graphqomb PTN text."""
    try:
        content = project_to_ptn(request.project, request.schedule)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"PTN export failed: {exc}") from exc
    return PtnExportResponseDTO(content=content)


@router.post("/import", response_model=PtnImportResponseDTO, response_model_exclude_none=True)
def import_ptn(request: PtnImportRequestDTO) -> PtnImportResponseDTO:
    """Import graphqomb PTN text as a Studio project."""
    try:
        project, schedule = ptn_to_project(request.content, request.name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"PTN import failed: {exc}") from exc
    return PtnImportResponseDTO(project=project, schedule=schedule)
