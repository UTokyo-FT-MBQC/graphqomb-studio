"""Validation API router.

POST /api/validate - Validate graph and flow.
"""

from fastapi import APIRouter
from graphqomb.feedforward import check_flow

from src.models.dto import ProjectPayloadDTO, ValidationErrorDTO, ValidationResponseDTO
from src.services.converter import dto_to_flow, dto_to_graphstate

router = APIRouter(prefix="/api", tags=["validation"])


@router.post("/validate", response_model=ValidationResponseDTO)
def validate_project(project: ProjectPayloadDTO) -> ValidationResponseDTO:
    """Validate graph structure and flow.

    Uses graphqomb's GraphState.check_canonical_form() and check_flow()
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
        xflow, zflow = dto_to_flow(project, node_map)

        # Check canonical form (all non-output nodes have measurement basis)
        graph.check_canonical_form()

        # Check flow validity
        check_flow(graph, xflow, zflow)

    except ValueError as e:
        errors.append(ValidationErrorDTO(type="validation", message=str(e)))
    except Exception as e:
        errors.append(ValidationErrorDTO(type="error", message=str(e)))

    return ValidationResponseDTO(valid=len(errors) == 0, errors=errors)
