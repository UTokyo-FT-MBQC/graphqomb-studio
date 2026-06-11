"""Pydantic DTOs matching frontend TypeScript types.

These models are designed to match the frontend types exactly,
with strict validation (extra="forbid") to prevent schema drift.
"""

from collections.abc import Mapping, Sequence, Set
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, model_validator

# === Utility Functions ===


def normalize_edge_id(source: str, target: str) -> str:
    """Normalize edge ID by sorting source and target alphabetically.

    This must match the frontend's normalizeEdgeId function exactly.
    """
    a, b = sorted([source, target])
    return f"{a}-{b}"


# === Coordinate DTOs ===


class CoordinateDTO(BaseModel):
    """3D coordinate (x, y, z). All coordinates are 3D."""

    model_config = ConfigDict(extra="forbid")

    x: float
    y: float
    z: float


# === Measurement Basis DTOs ===


class PlannerMeasBasisDTO(BaseModel):
    """Planner measurement basis (plane + angle coefficient)."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["planner"]
    plane: Literal["XY", "YZ", "XZ"]
    angleCoeff: float  # a in 2πa (e.g., 0.25 = π/2)


class AxisMeasBasisDTO(BaseModel):
    """Axis measurement basis (Pauli axis + sign)."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["axis"]
    axis: Literal["X", "Y", "Z"]
    sign: Literal["PLUS", "MINUS"]


MeasBasisDTO = PlannerMeasBasisDTO | AxisMeasBasisDTO


# === Node DTOs ===


class GraphNodeDTO(BaseModel):
    """Graph node with role-based validation.

    - input: requires measBasis and qubitIndex
    - output: may have measBasis when the output is measured, requires qubitIndex
    - intermediate: requires measBasis, must NOT have qubitIndex
    """

    model_config = ConfigDict(extra="forbid")

    id: str
    coordinate: CoordinateDTO
    role: Literal["input", "output", "intermediate"]
    measBasis: MeasBasisDTO | None = None
    qubitIndex: int | None = None

    @model_validator(mode="after")
    def validate_role_requirements(self) -> Self:
        """Validate that fields match role requirements."""
        if self.role == "input":
            if self.measBasis is None:
                raise ValueError("input node requires measBasis")
            if self.qubitIndex is None:
                raise ValueError("input node requires qubitIndex")
        elif self.role == "output":
            if self.qubitIndex is None:
                raise ValueError("output node requires qubitIndex")
        elif self.role == "intermediate":
            if self.measBasis is None:
                raise ValueError("intermediate node requires measBasis")
            if self.qubitIndex is not None:
                raise ValueError("intermediate node must not have qubitIndex")
        return self


# === Edge DTOs ===


class GraphEdgeDTO(BaseModel):
    """Graph edge with normalized ID validation."""

    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    target: str

    @model_validator(mode="after")
    def validate_edge_id(self) -> Self:
        """Validate that edge ID is properly normalized."""
        expected_id = normalize_edge_id(self.source, self.target)
        if self.id != expected_id:
            raise ValueError(f"Edge id must be normalized: expected '{expected_id}', got '{self.id}'")
        return self


# === Flow DTOs ===


class FlowDefinitionDTO(BaseModel):
    """Flow definition (xflow + zflow)."""

    model_config = ConfigDict(extra="forbid")

    xflow: dict[str, list[str]]
    zflow: dict[str, list[str]] | Literal["auto"]


# === FTQC DTOs ===


class FTQCDefinitionDTO(BaseModel):
    """FTQC (Fault-Tolerant Quantum Computing) configuration.

    - parityCheckGroup: List of node ID groups for parity check (error detection)
    - logicalObservableGroup: Mapping of observable index to target node IDs
    """

    model_config = ConfigDict(extra="forbid")

    parityCheckGroup: list[list[str]]
    logicalObservableGroup: dict[str, list[str]]


# === Project DTO ===


class ProjectPayloadDTO(BaseModel):
    """Project payload for API requests (matches frontend ProjectPayload type).

    Does not include $schema or schedule (those are only in the full Project type).
    """

    model_config = ConfigDict(extra="forbid")

    name: str
    nodes: list[GraphNodeDTO]
    edges: list[GraphEdgeDTO]
    flow: FlowDefinitionDTO
    ftqc: FTQCDefinitionDTO | None = None

    @model_validator(mode="after")
    def validate_project_references(self) -> Self:
        """Validate references that span nodes, edges, and flow definitions."""
        node_ids = [node.id for node in self.nodes]
        node_id_set = set(node_ids)
        if len(node_ids) != len(node_id_set):
            raise ValueError("node IDs must be unique")

        for edge in self.edges:
            if edge.source == edge.target:
                raise ValueError(f"self-edge is not allowed: {edge.id}")
            if edge.source not in node_id_set:
                raise ValueError(f"edge '{edge.id}' references unknown source node '{edge.source}'")
            if edge.target not in node_id_set:
                raise ValueError(f"edge '{edge.id}' references unknown target node '{edge.target}'")

        self._validate_flow_references("xflow", self.flow.xflow, node_id_set)
        if self.flow.zflow != "auto":
            self._validate_flow_references("zflow", self.flow.zflow, node_id_set)

        return self

    @staticmethod
    def _validate_flow_references(flow_name: str, flow: Mapping[str, Sequence[str]], node_ids: Set[str]) -> None:
        """Validate that a flow map only references existing nodes."""
        for node_id, targets in flow.items():
            if node_id not in node_ids:
                raise ValueError(f"{flow_name} references unknown source node '{node_id}'")
            for target_id in targets:
                if target_id not in node_ids:
                    raise ValueError(f"{flow_name} for node '{node_id}' references unknown target node '{target_id}'")


# === Response DTOs ===


class ValidationErrorDTO(BaseModel):
    """Single validation error."""

    type: str
    message: str


class ValidationResponseDTO(BaseModel):
    """Response from /api/validate endpoint."""

    valid: bool
    errors: list[ValidationErrorDTO]


class TimeSliceDTO(BaseModel):
    """Single time slice in the schedule timeline."""

    time: int
    prepareNodes: list[str]
    entangleEdges: list[str]
    measureNodes: list[str]


class ScheduleResultDTO(BaseModel):
    """Response from /api/schedule endpoint."""

    prepareTime: dict[str, int | None]
    measureTime: dict[str, int | None]
    entangleTime: dict[str, int | None]
    timeline: list[TimeSliceDTO]
