"""Schedule API router.

POST /api/schedule - Compute measurement schedule.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from graphqomb.schedule_solver import ScheduleConfig, Strategy
from graphqomb.scheduler import Scheduler

from src.models.dto import ProjectPayloadDTO, ScheduleResultDTO
from src.services.converter import dto_to_flow, dto_to_graphstate, schedule_to_dto

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
