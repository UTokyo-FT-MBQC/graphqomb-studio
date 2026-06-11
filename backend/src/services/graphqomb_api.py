"""Temporary GraphQOMB GraphState API bridge.

Prefer the current graphqomb API (`nodes`, `edges`, `add_node`, `add_edge`).
The `physical_*` fallback only supports the PyPI 0.3.1 shape and should be
removed once the published package catches up.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class CurrentGraphState(Protocol):
    @property
    def nodes(self) -> set[int]: ...

    @property
    def edges(self) -> set[tuple[int, int]]: ...

    def add_node(self, node: int | None = None, *, coordinate: tuple[float, ...] | None = None) -> int: ...

    def add_edge(self, node1: int, node2: int) -> None: ...


@runtime_checkable
class PhysicalGraphState(Protocol):
    @property
    def physical_nodes(self) -> set[int]: ...

    @property
    def physical_edges(self) -> set[tuple[int, int]]: ...

    def add_physical_node(self, coordinate: tuple[float, ...] | None = None) -> int: ...

    def add_physical_edge(self, node1: int, node2: int) -> None: ...


GraphStateApi = CurrentGraphState | PhysicalGraphState


def graph_nodes(graph: GraphStateApi) -> set[int]:
    """Return graph nodes, preferring the current graphqomb API."""
    if isinstance(graph, CurrentGraphState):
        return graph.nodes
    return graph.physical_nodes


def graph_edges(graph: GraphStateApi) -> set[tuple[int, int]]:
    """Return graph edges, preferring the current graphqomb API."""
    if isinstance(graph, CurrentGraphState):
        return graph.edges
    return graph.physical_edges


def add_graph_node(graph: GraphStateApi, *, coordinate: tuple[float, ...]) -> int:
    """Add a node, preferring the current graphqomb API."""
    if isinstance(graph, CurrentGraphState):
        return graph.add_node(coordinate=coordinate)
    return graph.add_physical_node(coordinate=coordinate)


def add_graph_edge(graph: GraphStateApi, node1: int, node2: int) -> None:
    """Add an edge, preferring the current graphqomb API."""
    if isinstance(graph, CurrentGraphState):
        graph.add_edge(node1, node2)
        return
    graph.add_physical_edge(node1, node2)
