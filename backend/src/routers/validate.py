"""Validation API router.

POST /api/validate - Validate graph and flow.
"""

from fastapi import APIRouter
from graphqomb.pauli_frame import make_frame

from src.models.dto import ProjectPayloadDTO, ValidationErrorDTO, ValidationResponseDTO
from src.services.converter import compute_zflow_from_xflow, dto_to_flow, dto_to_graphstate

router = APIRouter(prefix="/api", tags=["validation"])


@router.post("/validate", response_model=ValidationResponseDTO)
def validate_project(project: ProjectPayloadDTO) -> ValidationResponseDTO:
    """Validate graph structure and flow.

    Uses graphqomb's GraphState.check_canonical_form() and make_frame()
    to validate the project.

    Args:
        project: The project payload to validate.

    Returns:
        ValidationResponseDTO with valid=True if all checks pass,
        or valid=False with error details if validation fails.
    """
    errors: list[ValidationErrorDTO] = []

    try:
        # Convert DTO to graphqomb objects
        graph, node_map = dto_to_graphstate(project)
        xflow, zflow, cflow = dto_to_flow(project, node_map)

        # Check canonical form against graphqomb's graph/input/output conventions.
        graph.check_canonical_form()

        # Check flow validity
        if zflow is None:
            zflow = compute_zflow_from_xflow(graph, xflow)
        make_frame(graph, xflow, zflow, cflow=cflow)

    except ValueError as e:
        errors.append(ValidationErrorDTO(type="validation", message=str(e)))
    except Exception as e:
        errors.append(ValidationErrorDTO(type="error", message=str(e)))

    return ValidationResponseDTO(valid=len(errors) == 0, errors=errors)
