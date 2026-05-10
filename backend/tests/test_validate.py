"""Validation API endpoint tests."""

from typing import Any

from httpx import ASGITransport, AsyncClient
from src.main import app


def create_simple_project() -> dict[str, Any]:
    """Create a simple valid project for testing."""
    return {
        "name": "Test Project",
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0, "z": 0},
                "role": "input",
                "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
                "qubitIndex": 0,
            },
            {
                "id": "n1",
                "coordinate": {"x": 1, "y": 0, "z": 0},
                "role": "output",
                "qubitIndex": 0,
            },
        ],
        "edges": [{"id": "n0-n1", "source": "n0", "target": "n1"}],
        "flow": {"xflow": {"n0": ["n1"]}, "zflow": "auto"},
    }


async def test_validate_valid_project() -> None:
    """Test validation of a valid project returns success."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=create_simple_project())

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["errors"] == []


async def test_validate_empty_project() -> None:
    """Test validation of an empty project."""
    project: dict[str, Any] = {
        "name": "Empty",
        "nodes": [],
        "edges": [],
        "flow": {"xflow": {}, "zflow": "auto"},
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 200
    # Empty project should be valid (no nodes to check)
    data = response.json()
    assert data["valid"] is True


async def test_validate_missing_meas_basis() -> None:
    """Test validation fails when intermediate node lacks measBasis."""
    # This should fail at the DTO level (Pydantic validation)
    project: dict[str, Any] = {
        "name": "Test",
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0, "z": 0},
                "role": "intermediate",
                # Missing measBasis
            },
        ],
        "edges": [],
        "flow": {"xflow": {}, "zflow": "auto"},
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    # Should fail with 422 (validation error)
    assert response.status_code == 422


async def test_validate_invalid_edge_id() -> None:
    """Test validation fails with non-normalized edge ID."""
    project: dict[str, Any] = {
        "name": "Test",
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0, "z": 0},
                "role": "input",
                "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
                "qubitIndex": 0,
            },
            {
                "id": "n1",
                "coordinate": {"x": 1, "y": 0, "z": 0},
                "role": "output",
                "qubitIndex": 0,
            },
        ],
        "edges": [{"id": "n1-n0", "source": "n0", "target": "n1"}],  # Wrong order
        "flow": {"xflow": {}, "zflow": "auto"},
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    # Should fail with 422 (validation error)
    assert response.status_code == 422


async def test_validate_rejects_duplicate_node_ids() -> None:
    """Test validation fails when node IDs are duplicated."""
    project = create_simple_project()
    project["nodes"].append(
        {
            "id": "n0",
            "coordinate": {"x": 2, "y": 0, "z": 0},
            "role": "intermediate",
            "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
        }
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422


async def test_validate_rejects_unknown_edge_endpoint() -> None:
    """Test validation fails when an edge references a missing node."""
    project = create_simple_project()
    project["edges"] = [{"id": "n0-n2", "source": "n0", "target": "n2"}]

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422


async def test_validate_rejects_self_edge() -> None:
    """Test validation fails when an edge connects a node to itself."""
    project = create_simple_project()
    project["edges"] = [{"id": "n0-n0", "source": "n0", "target": "n0"}]

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422


async def test_validate_rejects_unknown_xflow_reference() -> None:
    """Test validation fails when xflow references a missing node."""
    project = create_simple_project()
    project["flow"] = {"xflow": {"n0": ["n2"]}, "zflow": "auto"}

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422


async def test_validate_rejects_unknown_xflow_source() -> None:
    """Test validation fails when xflow has a missing source node."""
    project = create_simple_project()
    project["flow"] = {"xflow": {"n2": ["n1"]}, "zflow": "auto"}

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422


async def test_validate_rejects_unknown_manual_zflow_reference() -> None:
    """Test validation fails when manual zflow references a missing node."""
    project = create_simple_project()
    project["flow"] = {"xflow": {"n0": ["n1"]}, "zflow": {"n0": ["n2"]}}

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422


async def test_validate_rejects_unknown_manual_zflow_source() -> None:
    """Test validation fails when manual zflow has a missing source node."""
    project = create_simple_project()
    project["flow"] = {"xflow": {"n0": ["n1"]}, "zflow": {"n2": ["n1"]}}

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422


async def test_validate_project_with_different_z() -> None:
    """Test validation of a project with nodes at different Z levels."""
    project = {
        "name": "Multi-Z Test",
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0, "z": 0},
                "role": "input",
                "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
                "qubitIndex": 0,
            },
            {
                "id": "n1",
                "coordinate": {"x": 1, "y": 0, "z": 1},
                "role": "output",
                "qubitIndex": 0,
            },
        ],
        "edges": [{"id": "n0-n1", "source": "n0", "target": "n1"}],
        "flow": {"xflow": {"n0": ["n1"]}, "zflow": "auto"},
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
