"""Converter service for DTO to graphqomb library object conversion.

This module provides functions to convert frontend DTOs to graphqomb
library objects (DRY principle - no reimplementation of graphqomb logic).
"""

import math

from graphqomb.common import Axis, AxisMeasBasis, Plane, PlannerMeasBasis, Sign
from graphqomb.graphstate import GraphState

from src.models.dto import (
    AxisMeasBasisDTO,
    PlannerMeasBasisDTO,
    ProjectPayloadDTO,
    ScheduleResultDTO,
    TimeSliceDTO,
    normalize_edge_id,
)


def dto_to_graphstate(project: ProjectPayloadDTO) -> tuple[GraphState, dict[str, int]]:
    """Convert ProjectPayloadDTO to graphqomb GraphState.

    Args:
        project: The project payload DTO from the frontend.

    Returns:
        A tuple of (GraphState, node_map) where node_map maps
        frontend node IDs (str) to graphqomb node indices (int).
    """
    graph = GraphState()
    node_map: dict[str, int] = {}

    # Add nodes
    for node_dto in project.nodes:
        coord = node_dto.coordinate
        coord_tuple = (coord.x, coord.y, coord.z)
        node_id = graph.add_physical_node(coordinate=coord_tuple)
        node_map[node_dto.id] = node_id

    # Add edges
    for edge_dto in project.edges:
        source_id = node_map[edge_dto.source]
        target_id = node_map[edge_dto.target]
        graph.add_physical_edge(source_id, target_id)

    # Register inputs and outputs
    for node_dto in project.nodes:
        node_id = node_map[node_dto.id]
        if node_dto.role == "input" and node_dto.qubitIndex is not None:
            graph.register_input(node_id, node_dto.qubitIndex)
        elif node_dto.role == "output" and node_dto.qubitIndex is not None:
            graph.register_output(node_id, node_dto.qubitIndex)

    # Assign measurement bases
    for node_dto in project.nodes:
        if node_dto.measBasis is not None:
            node_id = node_map[node_dto.id]
            meas_basis = dto_to_meas_basis(node_dto.measBasis)
            graph.assign_meas_basis(node_id, meas_basis)

    return graph, node_map


def dto_to_meas_basis(dto: PlannerMeasBasisDTO | AxisMeasBasisDTO) -> PlannerMeasBasis | AxisMeasBasis:
    """Convert measurement basis DTO to graphqomb MeasBasis object.

    Args:
        dto: The measurement basis DTO.

    Returns:
        A graphqomb PlannerMeasBasis or AxisMeasBasis object.
    """
    if isinstance(dto, PlannerMeasBasisDTO):
        plane = Plane[dto.plane]
        angle = 2 * math.pi * dto.angleCoeff
        return PlannerMeasBasis(plane, angle)
    else:
        axis = Axis[dto.axis]
        sign = Sign[dto.sign]
        return AxisMeasBasis(axis, sign)


def dto_to_flow(
    project: ProjectPayloadDTO,
    node_map: dict[str, int],
) -> tuple[dict[int, set[int]], dict[int, set[int]] | None]:
    """Convert FlowDefinitionDTO to graphqomb flow format.

    Args:
        project: The project payload DTO.
        node_map: Mapping from frontend node IDs to graphqomb indices.

    Returns:
        A tuple of (xflow, zflow) where:
        - xflow: dict mapping node indices to sets of correction target indices
        - zflow: dict mapping node indices to sets of correction target indices,
                 or None if zflow is "auto"
    """
    xflow: dict[int, set[int]] = {}
    for node_id, targets in project.flow.xflow.items():
        if node_id in node_map:
            xflow[node_map[node_id]] = {node_map[t] for t in targets if t in node_map}

    if project.flow.zflow == "auto":
        return xflow, None

    zflow: dict[int, set[int]] = {}
    for node_id, targets in project.flow.zflow.items():
        if node_id in node_map:
            zflow[node_map[node_id]] = {node_map[t] for t in targets if t in node_map}

    return xflow, zflow


def schedule_to_dto(
    prepare_time: dict[int, int | None],
    measure_time: dict[int, int | None],
    entangle_time: dict[tuple[int, int], int | None],
    timeline: list[object],  # TimeSlice from graphqomb
    reverse_map: dict[int, str],
) -> ScheduleResultDTO:
    """Convert graphqomb schedule result to DTO.

    Args:
        prepare_time: Preparation times per node.
        measure_time: Measurement times per node.
        entangle_time: Entanglement times per edge.
        timeline: List of TimeSlice objects from graphqomb.
        reverse_map: Mapping from graphqomb node indices back to frontend IDs.

    Returns:
        A ScheduleResultDTO for the API response.
    """
    # Convert prepare times
    prepare_time_dto: dict[str, int | None] = {}
    for node_id, time in prepare_time.items():
        if node_id in reverse_map:
            prepare_time_dto[reverse_map[node_id]] = time

    # Convert measure times
    measure_time_dto: dict[str, int | None] = {}
    for node_id, time in measure_time.items():
        if node_id in reverse_map:
            measure_time_dto[reverse_map[node_id]] = time

    # Convert entangle times
    entangle_time_dto: dict[str, int | None] = {}
    for edge, time in entangle_time.items():
        if edge[0] in reverse_map and edge[1] in reverse_map:
            edge_id = normalize_edge_id(reverse_map[edge[0]], reverse_map[edge[1]])
            entangle_time_dto[edge_id] = time

    # Convert timeline
    timeline_dto: list[TimeSliceDTO] = []
    for i, ts in enumerate(timeline):
        # TimeSlice has: prepare_nodes, entangle_edges, measure_nodes
        prepare_nodes = [reverse_map[n] for n in ts.prepare_nodes if n in reverse_map]  # type: ignore[attr-defined]
        measure_nodes = [reverse_map[n] for n in ts.measure_nodes if n in reverse_map]  # type: ignore[attr-defined]
        entangle_edges = [
            normalize_edge_id(reverse_map[e[0]], reverse_map[e[1]])
            for e in ts.entangle_edges  # type: ignore[attr-defined]
            if e[0] in reverse_map and e[1] in reverse_map
        ]

        timeline_dto.append(
            TimeSliceDTO(
                time=i,
                prepareNodes=prepare_nodes,
                entangleEdges=entangle_edges,
                measureNodes=measure_nodes,
            )
        )

    return ScheduleResultDTO(
        prepareTime=prepare_time_dto,
        measureTime=measure_time_dto,
        entangleTime=entangle_time_dto,
        timeline=timeline_dto,
    )


def compute_zflow_from_xflow(
    graph: GraphState,
    xflow: dict[int, set[int]],
) -> dict[int, set[int]]:
    """Compute z-flow from x-flow using odd_neighbors.

    Args:
        graph: The graphqomb GraphState.
        xflow: The x-flow mapping.

    Returns:
        The computed z-flow mapping.
    """
    from graphqomb.graphstate import odd_neighbors

    zflow: dict[int, set[int]] = {}
    for node, targets in xflow.items():
        zflow[node] = odd_neighbors(targets, graph)

    return zflow


def zflow_to_dto(
    zflow: dict[int, set[int]],
    reverse_map: dict[int, str],
) -> dict[str, list[str]]:
    """Convert graphqomb z-flow to frontend format.

    Args:
        zflow: The z-flow mapping with graphqomb indices.
        reverse_map: Mapping from graphqomb indices to frontend IDs.

    Returns:
        The z-flow in frontend format (node IDs to lists of target IDs).
    """
    result: dict[str, list[str]] = {}
    for node_id, targets in zflow.items():
        if node_id in reverse_map:
            result[reverse_map[node_id]] = [reverse_map[t] for t in targets if t in reverse_map]
    return result
