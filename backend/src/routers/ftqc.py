"""FTQC compilation API router."""

from fastapi import APIRouter, HTTPException
from graphqomb.pauli_frame import PauliFrame

from src.models.dto import FTQCDefinitionDTO, ProjectPayloadDTO
from src.services.converter import compute_zflow_from_xflow, dto_to_flow, dto_to_graphstate

router = APIRouter(prefix="/api", tags=["ftqc"])


@router.post("/compile-ftqc", response_model=FTQCDefinitionDTO)
def compile_ftqc(project: ProjectPayloadDTO) -> FTQCDefinitionDTO:
    """Expand detector and logical-observable seeds with GraphQOMB's closure algorithm."""
    if project.ftqc is None:
        return FTQCDefinitionDTO(parityCheckGroup=[], parityCheckTags=[], logicalObservableGroup={})

    graph, node_map = dto_to_graphstate(project)
    reverse_map = {node: node_id for node_id, node in node_map.items()}
    xflow, zflow = dto_to_flow(project, node_map)
    if zflow is None:
        zflow = compute_zflow_from_xflow(graph, xflow)

    try:
        parity_check_group = [{node_map[node_id] for node_id in group} for group in project.ftqc.parityCheckGroup]
        parity_check_tags = project.ftqc.parityCheckTags or [""] * len(parity_check_group)
        logical_observables = {
            int(key): {node_map[node_id] for node_id in targets}
            for key, targets in project.ftqc.logicalObservableGroup.items()
        }
        pauli_frame = PauliFrame(
            graph,
            xflow,
            zflow,
            parity_check_group=parity_check_group,
            parity_check_tags=parity_check_tags,
            logical_observables=logical_observables,
        )
        compiled_detectors = [sorted(reverse_map[node] for node in group) for group in pauli_frame.detector_groups()]
        compiled_observables = {
            str(index): sorted(reverse_map[node] for node in pauli_frame.logical_observables_group(targets))
            for index, targets in sorted(logical_observables.items())
        }
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Unable to compile FTQC groups: {exc}") from exc

    return FTQCDefinitionDTO(
        parityCheckGroup=compiled_detectors,
        parityCheckTags=parity_check_tags,
        logicalObservableGroup=compiled_observables,
    )
