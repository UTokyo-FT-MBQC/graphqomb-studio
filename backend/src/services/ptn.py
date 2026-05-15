"""PTN conversion service.

This module converts between GraphQOMB Studio project DTOs and graphqomb's
human-readable PTN pattern format.
"""

import math
from collections.abc import Callable, Mapping

from graphqomb.command import TICK, E, M, N
from graphqomb.common import AxisMeasBasis, MeasBasis, PlannerMeasBasis
from graphqomb.pattern import Pattern
from graphqomb.qompiler import qompile
from graphqomb.scheduler import Scheduler

from src.models.dto import (
    AxisMeasBasisDTO,
    CoordinateDTO,
    FlowDefinitionDTO,
    FTQCDefinitionDTO,
    GraphEdgeDTO,
    GraphNodeDTO,
    PlannerMeasBasisDTO,
    ProjectPayloadDTO,
    ScheduleResultDTO,
    TimeSliceDTO,
    normalize_edge_id,
)
from src.services.converter import dto_to_flow, dto_to_graphstate, dto_to_schedule


def project_to_ptn(project: ProjectPayloadDTO, schedule: ScheduleResultDTO | None = None) -> str:
    """Convert a Studio project to graphqomb PTN text."""
    graph, node_map = dto_to_graphstate(project)
    xflow, zflow = dto_to_flow(project, node_map)
    parity_check_group, logical_observables = _ftqc_to_graphqomb(project.ftqc, node_map)

    scheduler: Scheduler | None = None
    if schedule is not None:
        scheduler = Scheduler(graph, xflow, zflow)
        prepare_time, measure_time, entangle_time = dto_to_schedule(schedule, node_map)
        scheduler.manual_schedule(prepare_time, measure_time, entangle_time)

    pattern = qompile(
        graph,
        xflow,
        zflow,
        parity_check_group=parity_check_group,
        logical_observables=logical_observables,
        scheduler=scheduler,
    )
    return _ptn_dumps()(pattern)


def ptn_to_project(content: str, name: str) -> tuple[ProjectPayloadDTO, ScheduleResultDTO]:
    """Convert graphqomb PTN text to a Studio project and schedule."""
    pattern = _ptn_loads()(content)
    project = _pattern_to_project(pattern, name)
    schedule = _pattern_to_schedule(pattern)
    return project, schedule


def _ptn_dumps() -> Callable[[Pattern], str]:
    try:
        from graphqomb.ptn_format import dumps
    except ModuleNotFoundError as exc:
        msg = "graphqomb>=0.3.1 with graphqomb.ptn_format is required for PTN export"
        raise RuntimeError(msg) from exc
    return dumps


def _ptn_loads() -> Callable[[str], Pattern]:
    try:
        from graphqomb.ptn_format import loads
    except ModuleNotFoundError as exc:
        msg = "graphqomb>=0.3.1 with graphqomb.ptn_format is required for PTN import"
        raise RuntimeError(msg) from exc
    return loads


def _ftqc_to_graphqomb(
    ftqc: FTQCDefinitionDTO | None,
    node_map: Mapping[str, int],
) -> tuple[list[set[int]] | None, dict[int, set[int]] | None]:
    if ftqc is None:
        return None, None

    parity_check_group = [{node_map[node_id] for node_id in group} for group in ftqc.parityCheckGroup]
    logical_observables = {
        int(logical_index): {node_map[node_id] for node_id in node_ids}
        for logical_index, node_ids in ftqc.logicalObservableGroup.items()
    }
    return parity_check_group, logical_observables


def _pattern_to_project(pattern: Pattern, name: str) -> ProjectPayloadDTO:
    graph = pattern.pauli_frame.graphstate
    input_nodes = graph.input_node_indices
    output_nodes = graph.output_node_indices
    overlapping_boundary_nodes = set(input_nodes) & set(output_nodes)
    if overlapping_boundary_nodes:
        msg = f"PTN nodes cannot be both input and output in Studio: {sorted(overlapping_boundary_nodes)}"
        raise ValueError(msg)

    meas_bases = graph.meas_bases
    coordinates = pattern.coordinates

    nodes = [
        _node_to_dto(
            node=node,
            input_nodes=input_nodes,
            output_nodes=output_nodes,
            meas_bases=meas_bases,
            coordinates=coordinates,
        )
        for node in sorted(graph.physical_nodes)
    ]
    edges = [
        GraphEdgeDTO(
            id=normalize_edge_id(str(node1), str(node2)),
            source=str(node1),
            target=str(node2),
        )
        for node1, node2 in sorted(graph.physical_edges)
    ]
    flow = FlowDefinitionDTO(
        xflow=_flow_to_dto(pattern.pauli_frame.xflow),
        zflow=_flow_to_dto(pattern.pauli_frame.zflow),
    )
    ftqc = _pattern_ftqc_to_dto(pattern)

    return ProjectPayloadDTO(name=name, nodes=nodes, edges=edges, flow=flow, ftqc=ftqc)


def _node_to_dto(
    *,
    node: int,
    input_nodes: Mapping[int, int],
    output_nodes: Mapping[int, int],
    meas_bases: Mapping[int, MeasBasis],
    coordinates: Mapping[int, tuple[float, ...]],
) -> GraphNodeDTO:
    node_id = str(node)
    coordinate = _coordinate_to_dto(coordinates.get(node))
    meas_basis = meas_bases.get(node)

    if node in input_nodes:
        if meas_basis is None:
            msg = f"Input node {node} is missing a measurement basis"
            raise ValueError(msg)
        return GraphNodeDTO(
            id=node_id,
            coordinate=coordinate,
            role="input",
            measBasis=_meas_basis_to_dto(meas_basis),
            qubitIndex=input_nodes[node],
        )

    if node in output_nodes:
        return GraphNodeDTO(
            id=node_id,
            coordinate=coordinate,
            role="output",
            measBasis=_meas_basis_to_dto(meas_basis) if meas_basis is not None else None,
            qubitIndex=output_nodes[node],
        )

    if meas_basis is None:
        msg = f"Intermediate node {node} is missing a measurement basis"
        raise ValueError(msg)
    return GraphNodeDTO(
        id=node_id,
        coordinate=coordinate,
        role="intermediate",
        measBasis=_meas_basis_to_dto(meas_basis),
    )


def _coordinate_to_dto(coordinate: tuple[float, ...] | None) -> CoordinateDTO:
    if coordinate is None:
        return CoordinateDTO(x=0, y=0, z=0)
    if len(coordinate) == 2:
        return CoordinateDTO(x=coordinate[0], y=coordinate[1], z=0)
    if len(coordinate) == 3:
        return CoordinateDTO(x=coordinate[0], y=coordinate[1], z=coordinate[2])
    msg = f"Studio supports only 2D or 3D PTN coordinates, got {len(coordinate)}D"
    raise ValueError(msg)


def _meas_basis_to_dto(meas_basis: MeasBasis) -> PlannerMeasBasisDTO | AxisMeasBasisDTO:
    if isinstance(meas_basis, AxisMeasBasis):
        return AxisMeasBasisDTO(type="axis", axis=meas_basis.axis.name, sign=meas_basis.sign.name)
    if isinstance(meas_basis, PlannerMeasBasis):
        return PlannerMeasBasisDTO(
            type="planner",
            plane=meas_basis.plane.name,
            angleCoeff=meas_basis.angle / (2 * math.pi),
        )
    msg = f"Unsupported measurement basis type: {type(meas_basis).__name__}"
    raise TypeError(msg)


def _flow_to_dto(flow: Mapping[int, set[int]]) -> dict[str, list[str]]:
    return {
        str(node): [str(target) for target in sorted(targets)]
        for node, targets in sorted(flow.items())
    }


def _pattern_ftqc_to_dto(pattern: Pattern) -> FTQCDefinitionDTO | None:
    parity_check_group = [
        [str(node) for node in sorted(group)]
        for group in pattern.pauli_frame.parity_check_group
    ]
    logical_observable_group = {
        str(logical_index): [str(node) for node in sorted(nodes)]
        for logical_index, nodes in sorted(pattern.pauli_frame.logical_observables.items())
    }

    if not parity_check_group and not logical_observable_group:
        return None
    return FTQCDefinitionDTO(
        parityCheckGroup=parity_check_group,
        logicalObservableGroup=logical_observable_group,
    )


def _pattern_to_schedule(pattern: Pattern) -> ScheduleResultDTO:
    prepare_time: dict[str, int | None] = {}
    measure_time: dict[str, int | None] = {}
    entangle_time: dict[str, int | None] = {}
    timeline_by_time: dict[int, TimeSliceDTO] = {}
    current_time = 0

    for command in pattern.commands:
        if isinstance(command, TICK):
            current_time += 1
        elif isinstance(command, N):
            node_id = str(command.node)
            prepare_time[node_id] = current_time
            _time_slice(timeline_by_time, current_time).prepareNodes.append(node_id)
        elif isinstance(command, E):
            edge_id = normalize_edge_id(str(command.nodes[0]), str(command.nodes[1]))
            entangle_time[edge_id] = current_time
            _time_slice(timeline_by_time, current_time).entangleEdges.append(edge_id)
        elif isinstance(command, M):
            node_id = str(command.node)
            measure_time[node_id] = current_time
            _time_slice(timeline_by_time, current_time).measureNodes.append(node_id)

    return ScheduleResultDTO(
        prepareTime=prepare_time,
        measureTime=measure_time,
        entangleTime=entangle_time,
        timeline=[timeline_by_time[time] for time in sorted(timeline_by_time)],
    )


def _time_slice(timeline_by_time: dict[int, TimeSliceDTO], time: int) -> TimeSliceDTO:
    if time not in timeline_by_time:
        timeline_by_time[time] = TimeSliceDTO(
            time=time,
            prepareNodes=[],
            entangleEdges=[],
            measureNodes=[],
        )
    return timeline_by_time[time]
