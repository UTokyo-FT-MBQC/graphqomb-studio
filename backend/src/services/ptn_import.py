"""Convert GraphQOMB .ptn files into GraphQOMB Studio projects."""

from __future__ import annotations

import math
from pathlib import Path
from typing import TYPE_CHECKING, Any

import networkx as nx
from graphqomb.command import TICK, E, M, N
from graphqomb.common import AxisMeasBasis, PlannerMeasBasis
from graphqomb.ptn_format import loads

from src.models.dto import normalize_edge_id

if TYPE_CHECKING:
    from collections.abc import Mapping

    from graphqomb.common import MeasBasis
    from graphqomb.pattern import Pattern

SPRING_LAYOUT_SEED = 42

type Coordinate = dict[str, float]
type GraphNode = dict[str, Any]
type GraphEdge = dict[str, str]
type ScheduleResult = dict[str, dict[str, int | None] | list[dict[str, int | list[str]]]]
type Project = dict[str, Any]


def load_ptn_project(path: Path | str) -> Project:
    """Read a .ptn file and convert it to a Studio project."""
    source = Path(path)
    return ptn_text_to_project(source.read_text(encoding="utf-8"), name=source.stem)


def ptn_text_to_project(text: str, *, name: str = "Imported PTN") -> Project:
    """Convert .ptn text to a Studio project."""
    pattern = loads(_strip_unsupported_correction_commands(text))
    return pattern_to_project(pattern, name=name)


def pattern_to_project(pattern: Pattern, *, name: str = "Imported PTN") -> Project:
    """Convert a loaded GraphQOMB Pattern to a Studio project."""
    graph = pattern.pauli_frame.graphstate
    node_ids = sorted(graph.physical_nodes)
    meas_bases = graph.meas_bases
    edges = graph.physical_edges

    coordinates = _coordinates_for_nodes(node_ids, edges, graph.coordinates)
    studio_nodes = [
        _node_to_studio(
            node,
            coordinate=coordinates[node],
            input_indices=graph.input_node_indices,
            output_indices=graph.output_node_indices,
            meas_bases=meas_bases,
        )
        for node in node_ids
    ]
    studio_edges = [_edge_to_studio(node1, node2) for node1, node2 in sorted(edges)]
    xflow = _flow_to_studio(pattern.pauli_frame.xflow)
    zflow = _flow_to_studio(pattern.pauli_frame.zflow)

    return {
        "$schema": "graphqomb-studio/v1",
        "name": name,
        "nodes": studio_nodes,
        "edges": studio_edges,
        "flow": {"xflow": xflow, "zflow": zflow},
        "ftqc": {
            "parityCheckGroup": [_node_set_to_ids(group) for group in pattern.pauli_frame.parity_check_group],
            "logicalObservableGroup": {
                str(index): _node_set_to_ids(nodes)
                for index, nodes in sorted(pattern.pauli_frame.logical_observables.items())
            },
        },
        "schedule": _schedule_to_studio(pattern),
    }


def _strip_unsupported_correction_commands(text: str) -> str:
    """Remove legacy quantum-section X/Z correction commands before ptn_format parsing."""
    kept_lines: list[str] = []
    for raw_line in text.splitlines():
        stripped = raw_line.split("#", 1)[0].strip()
        if stripped.startswith(("X ", "Z ")):
            continue
        kept_lines.append(raw_line)
    return "\n".join(kept_lines)


def _coordinates_for_nodes(
    nodes: list[int],
    edges: set[tuple[int, int]],
    source_coordinates: Mapping[int, tuple[float, ...]],
) -> dict[int, Coordinate]:
    if not nodes:
        return {}

    if all(node in source_coordinates for node in nodes):
        return {node: _normalize_coordinate(source_coordinates[node]) for node in nodes}

    layout_graph: nx.Graph[int] = nx.Graph()
    layout_graph.add_nodes_from(nodes)
    layout_graph.add_edges_from(edges)

    fixed_positions = {
        node: (coord[0], coord[1])
        for node, coord in source_coordinates.items()
        if node in nodes and len(coord) >= 2
    }
    fixed_nodes = list(fixed_positions) if fixed_positions else None
    layout = nx.spring_layout(
        layout_graph,
        pos=fixed_positions or None,
        fixed=fixed_nodes,
        seed=SPRING_LAYOUT_SEED,
        scale=max(3.0, math.sqrt(len(nodes))),
    )

    coordinates: dict[int, Coordinate] = {}
    for node in nodes:
        if node in source_coordinates:
            coordinates[node] = _normalize_coordinate(source_coordinates[node])
            continue
        x, y = layout[node]
        coordinates[node] = {"x": float(x), "y": float(y), "z": 0.0}
    return coordinates


def _normalize_coordinate(coord: tuple[float, ...]) -> Coordinate:
    if len(coord) == 2:
        x, y = coord
        return {"x": float(x), "y": float(y), "z": 0.0}
    if len(coord) == 3:
        x, y, z = coord
        return {"x": float(x), "y": float(y), "z": float(z)}
    msg = f"Expected 2D or 3D coordinate, got {len(coord)} values"
    raise ValueError(msg)


def _node_to_studio(
    node: int,
    *,
    coordinate: Coordinate,
    input_indices: Mapping[int, int],
    output_indices: Mapping[int, int],
    meas_bases: Mapping[int, MeasBasis],
) -> GraphNode:
    node_id = _node_id(node)
    if node in output_indices:
        result: GraphNode = {
            "id": node_id,
            "coordinate": coordinate,
            "role": "output",
            "qubitIndex": output_indices[node],
        }
        if meas_basis := meas_bases.get(node):
            result["measBasis"] = _meas_basis_to_studio(meas_basis)
        return result

    meas_basis = meas_bases.get(node)
    if meas_basis is None:
        msg = f"Measurement basis not set for non-output node {node}"
        raise ValueError(msg)

    result: GraphNode = {
        "id": node_id,
        "coordinate": coordinate,
        "role": "input" if node in input_indices else "intermediate",
        "measBasis": _meas_basis_to_studio(meas_basis),
    }
    if node in input_indices:
        result["qubitIndex"] = input_indices[node]
    return result


def _meas_basis_to_studio(meas_basis: MeasBasis) -> dict[str, str | float]:
    if isinstance(meas_basis, AxisMeasBasis):
        return {
            "type": "axis",
            "axis": meas_basis.axis.name,
            "sign": meas_basis.sign.name,
        }
    if isinstance(meas_basis, PlannerMeasBasis):
        return {
            "type": "planner",
            "plane": meas_basis.plane.name,
            "angleCoeff": meas_basis.angle / (2 * math.pi),
        }
    msg = f"Unsupported measurement basis type: {type(meas_basis).__name__}"
    raise TypeError(msg)


def _edge_to_studio(node1: int, node2: int) -> GraphEdge:
    source = _node_id(node1)
    target = _node_id(node2)
    return {
        "id": normalize_edge_id(source, target),
        "source": source,
        "target": target,
    }


def _flow_to_studio(flow: Mapping[int, set[int]]) -> dict[str, list[str]]:
    return {
        _node_id(source): _node_set_to_ids(targets)
        for source, targets in sorted(flow.items())
        if targets
    }


def _schedule_to_studio(pattern: Pattern) -> dict[str, Any]:
    prepare_time: dict[str, int | None] = {}
    measure_time: dict[str, int | None] = {}
    entangle_time: dict[str, int | None] = {}
    timeline: list[dict[str, int | list[str]]] = []

    time = 0
    current_prepare: list[str] = []
    current_measure: list[str] = []
    current_entangle: list[str] = []

    def flush() -> None:
        timeline.append(
            {
                "time": len(timeline),
                "prepareNodes": list(current_prepare),
                "entangleEdges": list(current_entangle),
                "measureNodes": list(current_measure),
            }
        )
        current_prepare.clear()
        current_entangle.clear()
        current_measure.clear()

    for cmd in pattern.commands:
        if isinstance(cmd, TICK):
            flush()
            time += 1
        elif isinstance(cmd, N):
            node_id = _node_id(cmd.node)
            current_prepare.append(node_id)
            prepare_time[node_id] = time
        elif isinstance(cmd, E):
            edge_id = normalize_edge_id(_node_id(cmd.nodes[0]), _node_id(cmd.nodes[1]))
            current_entangle.append(edge_id)
            entangle_time[edge_id] = time
        elif isinstance(cmd, M):
            node_id = _node_id(cmd.node)
            current_measure.append(node_id)
            measure_time[node_id] = time

    if current_prepare or current_entangle or current_measure or not timeline:
        flush()

    for node in pattern.input_node_indices:
        prepare_time.setdefault(_node_id(node), 0)
    for node in pattern.output_node_indices:
        prepare_time.setdefault(_node_id(node), 0)
        measure_time.setdefault(_node_id(node), None)

    return {
        "prepareTime": prepare_time,
        "measureTime": measure_time,
        "entangleTime": entangle_time,
        "timeline": timeline,
    }


def _node_set_to_ids(nodes: set[int]) -> list[str]:
    return [_node_id(node) for node in sorted(nodes)]


def _node_id(node: int) -> str:
    return f"n{node}"
