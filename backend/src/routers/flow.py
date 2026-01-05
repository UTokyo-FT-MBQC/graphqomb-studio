"""Flow API router.

POST /api/compute-zflow - Auto-compute z-flow from x-flow.
"""

from fastapi import APIRouter

from src.models.dto import ProjectPayloadDTO
from src.services.converter import compute_zflow_from_xflow, dto_to_graphstate, zflow_to_dto

router = APIRouter(prefix="/api", tags=["flow"])


@router.post("/compute-zflow")
def compute_zflow(project: ProjectPayloadDTO) -> dict[str, list[str]]:
    """Compute z-flow from x-flow using odd_neighbors.

    When zflow is set to "auto" in the frontend, this endpoint
    computes the actual z-flow corrections based on the x-flow
    and graph structure using the odd_neighbors algorithm.

    Args:
        project: The project payload containing the graph and x-flow.

    Returns:
        A dictionary mapping node IDs to lists of z-flow correction targets.
    """
    # Convert DTO to graphqomb objects
    graph, node_map = dto_to_graphstate(project)
    reverse_map = {v: k for k, v in node_map.items()}

    # Convert x-flow to internal format
    xflow: dict[int, set[int]] = {}
    for node_id, targets in project.flow.xflow.items():
        if node_id in node_map:
            xflow[node_map[node_id]] = {node_map[t] for t in targets if t in node_map}

    # Compute z-flow using odd_neighbors
    zflow = compute_zflow_from_xflow(graph, xflow)

    # Convert back to frontend format
    return zflow_to_dto(zflow, reverse_map)
