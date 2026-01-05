"""DTO validation tests."""

import pytest
from pydantic import ValidationError
from src.models.dto import (
    AxisMeasBasisDTO,
    Coordinate2D,
    Coordinate3D,
    FlowDefinitionDTO,
    GraphEdgeDTO,
    GraphNodeDTO,
    PlannerMeasBasisDTO,
    ProjectPayloadDTO,
    normalize_edge_id,
)


class TestNormalizeEdgeId:
    """Tests for edge ID normalization."""

    def test_normalize_already_sorted(self) -> None:
        """Test normalization when already sorted."""
        assert normalize_edge_id("a", "b") == "a-b"

    def test_normalize_needs_sorting(self) -> None:
        """Test normalization when sorting needed."""
        assert normalize_edge_id("b", "a") == "a-b"

    def test_normalize_same_source_target(self) -> None:
        """Test normalization with same source and target."""
        assert normalize_edge_id("a", "a") == "a-a"


class TestCoordinates:
    """Tests for coordinate DTOs."""

    def test_coordinate_2d(self) -> None:
        """Test 2D coordinate creation."""
        coord = Coordinate2D(x=1.0, y=2.0)
        assert coord.x == 1.0
        assert coord.y == 2.0

    def test_coordinate_3d(self) -> None:
        """Test 3D coordinate creation."""
        coord = Coordinate3D(x=1.0, y=2.0, z=3.0)
        assert coord.x == 1.0
        assert coord.y == 2.0
        assert coord.z == 3.0

    def test_coordinate_2d_rejects_extra_fields(self) -> None:
        """Test 2D coordinate rejects extra fields."""
        with pytest.raises(ValidationError):
            Coordinate2D(x=1.0, y=2.0, z=3.0)  # type: ignore[call-arg]


class TestMeasBasis:
    """Tests for measurement basis DTOs."""

    def test_planner_basis(self) -> None:
        """Test planner measurement basis."""
        basis = PlannerMeasBasisDTO(type="planner", plane="XY", angleCoeff=0.25)
        assert basis.type == "planner"
        assert basis.plane == "XY"
        assert basis.angleCoeff == 0.25

    def test_axis_basis(self) -> None:
        """Test axis measurement basis."""
        basis = AxisMeasBasisDTO(type="axis", axis="X", sign="PLUS")
        assert basis.type == "axis"
        assert basis.axis == "X"
        assert basis.sign == "PLUS"

    def test_planner_invalid_plane(self) -> None:
        """Test planner basis rejects invalid plane."""
        with pytest.raises(ValidationError):
            PlannerMeasBasisDTO(type="planner", plane="AB", angleCoeff=0.25)  # type: ignore[arg-type]

    def test_axis_invalid_axis(self) -> None:
        """Test axis basis rejects invalid axis."""
        with pytest.raises(ValidationError):
            AxisMeasBasisDTO(type="axis", axis="W", sign="PLUS")  # type: ignore[arg-type]


class TestGraphNode:
    """Tests for graph node DTO."""

    def test_input_node_valid(self) -> None:
        """Test valid input node."""
        node = GraphNodeDTO(
            id="n0",
            coordinate=Coordinate2D(x=0, y=0),
            role="input",
            measBasis=PlannerMeasBasisDTO(type="planner", plane="XY", angleCoeff=0),
            qubitIndex=0,
        )
        assert node.role == "input"

    def test_input_node_missing_meas_basis(self) -> None:
        """Test input node requires measBasis."""
        with pytest.raises(ValidationError, match="input node requires measBasis"):
            GraphNodeDTO(
                id="n0",
                coordinate=Coordinate2D(x=0, y=0),
                role="input",
                qubitIndex=0,
            )

    def test_input_node_missing_qubit_index(self) -> None:
        """Test input node requires qubitIndex."""
        with pytest.raises(ValidationError, match="input node requires qubitIndex"):
            GraphNodeDTO(
                id="n0",
                coordinate=Coordinate2D(x=0, y=0),
                role="input",
                measBasis=PlannerMeasBasisDTO(type="planner", plane="XY", angleCoeff=0),
            )

    def test_output_node_valid(self) -> None:
        """Test valid output node."""
        node = GraphNodeDTO(
            id="n0",
            coordinate=Coordinate2D(x=0, y=0),
            role="output",
            qubitIndex=0,
        )
        assert node.role == "output"

    def test_output_node_with_meas_basis(self) -> None:
        """Test output node must not have measBasis."""
        with pytest.raises(ValidationError, match="output node must not have measBasis"):
            GraphNodeDTO(
                id="n0",
                coordinate=Coordinate2D(x=0, y=0),
                role="output",
                measBasis=PlannerMeasBasisDTO(type="planner", plane="XY", angleCoeff=0),
                qubitIndex=0,
            )

    def test_intermediate_node_valid(self) -> None:
        """Test valid intermediate node."""
        node = GraphNodeDTO(
            id="n0",
            coordinate=Coordinate2D(x=0, y=0),
            role="intermediate",
            measBasis=PlannerMeasBasisDTO(type="planner", plane="XY", angleCoeff=0),
        )
        assert node.role == "intermediate"

    def test_intermediate_node_with_qubit_index(self) -> None:
        """Test intermediate node must not have qubitIndex."""
        with pytest.raises(ValidationError, match="intermediate node must not have qubitIndex"):
            GraphNodeDTO(
                id="n0",
                coordinate=Coordinate2D(x=0, y=0),
                role="intermediate",
                measBasis=PlannerMeasBasisDTO(type="planner", plane="XY", angleCoeff=0),
                qubitIndex=0,
            )


class TestGraphEdge:
    """Tests for graph edge DTO."""

    def test_valid_edge(self) -> None:
        """Test valid edge with normalized ID."""
        edge = GraphEdgeDTO(id="a-b", source="a", target="b")
        assert edge.id == "a-b"

    def test_valid_edge_reversed_order(self) -> None:
        """Test valid edge with source/target in reverse order."""
        edge = GraphEdgeDTO(id="a-b", source="b", target="a")
        assert edge.id == "a-b"

    def test_invalid_edge_id(self) -> None:
        """Test edge with non-normalized ID is rejected."""
        with pytest.raises(ValidationError, match="Edge id must be normalized"):
            GraphEdgeDTO(id="b-a", source="a", target="b")


class TestFlowDefinition:
    """Tests for flow definition DTO."""

    def test_manual_zflow(self) -> None:
        """Test flow with manual zflow."""
        flow = FlowDefinitionDTO(
            xflow={"n0": ["n1"]},
            zflow={"n0": ["n1"]},
        )
        assert flow.zflow == {"n0": ["n1"]}

    def test_auto_zflow(self) -> None:
        """Test flow with auto zflow."""
        flow = FlowDefinitionDTO(
            xflow={"n0": ["n1"]},
            zflow="auto",
        )
        assert flow.zflow == "auto"


class TestProjectPayload:
    """Tests for project payload DTO."""

    def test_valid_project(self) -> None:
        """Test valid project payload."""
        project = ProjectPayloadDTO(
            name="Test",
            dimension=2,
            nodes=[
                GraphNodeDTO(
                    id="n0",
                    coordinate=Coordinate2D(x=0, y=0),
                    role="input",
                    measBasis=PlannerMeasBasisDTO(type="planner", plane="XY", angleCoeff=0),
                    qubitIndex=0,
                ),
                GraphNodeDTO(
                    id="n1",
                    coordinate=Coordinate2D(x=1, y=0),
                    role="output",
                    qubitIndex=0,
                ),
            ],
            edges=[
                GraphEdgeDTO(id="n0-n1", source="n0", target="n1"),
            ],
            flow=FlowDefinitionDTO(xflow={"n0": ["n1"]}, zflow="auto"),
        )
        assert project.name == "Test"
        assert len(project.nodes) == 2
        assert len(project.edges) == 1

    def test_invalid_dimension(self) -> None:
        """Test project with invalid dimension is rejected."""
        with pytest.raises(ValidationError):
            ProjectPayloadDTO(
                name="Test",
                dimension=4,  # type: ignore[arg-type]
                nodes=[],
                edges=[],
                flow=FlowDefinitionDTO(xflow={}, zflow="auto"),
            )
