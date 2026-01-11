"""Schedule API router.

POST /api/schedule - Compute measurement schedule.
POST /api/validate-schedule - Validate a manually edited schedule.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from graphqomb.schedule_solver import ScheduleConfig, Strategy
from graphqomb.scheduler import Scheduler

from src.models.dto import (
    ProjectPayloadDTO,
    ScheduleResultDTO,
    ValidationErrorDTO,
    ValidationResponseDTO,
)
from src.services.converter import (
    dto_to_flow,
    dto_to_graphstate,
    dto_to_schedule,
    schedule_to_dto,
    translate_error_message,
)

router = APIRouter(prefix="/api", tags=["scheduling"])


@router.post("/schedule", response_model=ScheduleResultDTO)
def compute_schedule(
    project: ProjectPayloadDTO,
    strategy: Literal["MINIMIZE_SPACE", "MINIMIZE_TIME"] = Query(
        default="MINIMIZE_SPACE",
        description="Schedule optimization strategy",
    ),
) -> ScheduleResultDTO:
    """Compute measurement schedule for the graph.

    Uses graphqomb's Scheduler to compute an optimal schedule
    for preparing, entangling, and measuring qubits.

    Args:
        project: The project payload to schedule.
        strategy: Optimization strategy (MINIMIZE_SPACE or MINIMIZE_TIME).

    Returns:
        ScheduleResultDTO with timing information for each operation.

    Raises:
        HTTPException: If schedule computation fails.
    """
    # Convert DTO to graphqomb objects
    graph, node_map = dto_to_graphstate(project)
    xflow, zflow = dto_to_flow(project, node_map)

    # Create reverse map for converting back to frontend IDs
    reverse_map = {v: k for k, v in node_map.items()}

    # Create scheduler
    scheduler = Scheduler(graph, xflow, zflow)

    # Configure and solve
    config = ScheduleConfig(strategy=Strategy[strategy])

    try:
        success = scheduler.solve_schedule(config, timeout=60)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schedule computation failed: {e}") from e

    if not success:
        raise HTTPException(status_code=400, detail="Schedule computation failed: no solution found")

    # Convert result to DTO
    return schedule_to_dto(
        prepare_time=scheduler.prepare_time,
        measure_time=scheduler.measure_time,
        entangle_time=scheduler.entangle_time,
        timeline=scheduler.timeline,
        reverse_map=reverse_map,
    )


@router.post("/validate-schedule", response_model=ValidationResponseDTO)
def validate_schedule(
    project: ProjectPayloadDTO,
    schedule: ScheduleResultDTO,
) -> ValidationResponseDTO:
    """Validate a manually edited schedule.

    Uses graphqomb's Scheduler.validate_schedule() to check:
    - Input nodes are not prepared (assumed prepared before time 0)
    - Output nodes are not measured
    - All non-input nodes have preparation times
    - All non-output nodes have measurement times
    - Measurement order respects DAG dependencies (flow constraints)
    - Entanglement times respect causality constraints

    Args:
        project: The project payload with graph and flow.
        schedule: The schedule to validate.

    Returns:
        ValidationResponseDTO with valid=True if schedule is valid,
        or valid=False with detailed error messages if invalid.
    """
    errors: list[ValidationErrorDTO] = []
    reverse_map: dict[int, str] = {}

    try:
        # Convert DTO to graphqomb objects
        graph, node_map = dto_to_graphstate(project)
        xflow, zflow = dto_to_flow(project, node_map)

        # Create reverse map for error message translation
        reverse_map = {v: k for k, v in node_map.items()}

        # Create scheduler
        scheduler = Scheduler(graph, xflow, zflow)

        # Convert schedule DTO to graphqomb format
        prepare_time, measure_time, entangle_time = dto_to_schedule(schedule, node_map)

        # Set manual schedule
        scheduler.manual_schedule(prepare_time, measure_time, entangle_time)

        # Validate the schedule
        scheduler.validate_schedule()

    except ValueError as e:
        # Translate node indices in error message to frontend node IDs
        translated_message = translate_error_message(str(e), reverse_map)
        errors.append(ValidationErrorDTO(type="schedule_validation", message=translated_message))
    except Exception as e:
        errors.append(ValidationErrorDTO(type="error", message=str(e)))

    return ValidationResponseDTO(valid=len(errors) == 0, errors=errors)
