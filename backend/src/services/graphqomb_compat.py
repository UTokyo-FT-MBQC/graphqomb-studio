"""Compatibility helpers for supported graphqomb GraphState API shapes."""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:
    from collections.abc import Mapping

    from graphqomb.common import MeasBasis


@runtime_checkable
class LegacyGraphState(Protocol):
    """GraphState API used by graphqomb releases with physical_* names."""

    @property
    def physical_nodes(self) -> set[int]: ...

    @property
    def physical_edges(self) -> set[tuple[int, int]]: ...

    @property
    def coordinates(self) -> dict[int, tuple[float, ...]]: ...

    @property
    def meas_bases(self) -> Mapping[int, MeasBasis]: ...

    def add_physical_node(self, coordinate: tuple[float, ...] | None = None) -> int: ...

    def add_physical_edge(self, node1: int, node2: int) -> None: ...


@runtime_checkable
class StandardGraphState(Protocol):
    """GraphState API used by graphqomb releases with standard graph names."""

    @property
    def nodes(self) -> set[int]: ...

    @property
    def edges(self) -> set[tuple[int, int]]: ...

    @property
    def coordinates(self) -> dict[int, tuple[float, ...]]: ...

    @property
    def meas_bases(self) -> Mapping[int, MeasBasis]: ...

    def add_node(self, node: int | None = None, *, coordinate: tuple[float, ...] | None = None) -> int: ...

    def add_edge(self, node1: int, node2: int) -> None: ...


GraphStateLike = LegacyGraphState | StandardGraphState


def graph_nodes(graph: GraphStateLike) -> set[int]:
    """Return graph nodes across supported graphqomb API names."""
    if isinstance(graph, LegacyGraphState):
        return set(graph.physical_nodes)
    return set(graph.nodes)


def graph_edges(graph: GraphStateLike) -> set[tuple[int, int]]:
    """Return graph edges across supported graphqomb API names."""
    if isinstance(graph, LegacyGraphState):
        return set(graph.physical_edges)
    return set(graph.edges)


def graph_coordinates(graph: GraphStateLike) -> dict[int, tuple[float, ...]]:
    """Return graph coordinates."""
    return graph.coordinates


def graph_meas_bases(graph: GraphStateLike) -> Mapping[int, MeasBasis]:
    """Return graph measurement bases."""
    return graph.meas_bases


def add_graph_node(graph: GraphStateLike, *, coordinate: tuple[float, ...]) -> int:
    """Add a node across supported graphqomb API names."""
    if isinstance(graph, LegacyGraphState):
        return graph.add_physical_node(coordinate=coordinate)
    return graph.add_node(coordinate=coordinate)


def add_graph_edge(graph: GraphStateLike, node1: int, node2: int) -> None:
    """Add an edge across supported graphqomb API names."""
    if isinstance(graph, LegacyGraphState):
        graph.add_physical_edge(node1, node2)
        return
    graph.add_edge(node1, node2)
