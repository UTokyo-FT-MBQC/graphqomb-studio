"""Validation API endpoint tests."""

from httpx import ASGITransport, AsyncClient
from src.main import app


def create_simple_project() -> dict:
    """Create a simple valid project for testing."""
    return {
        "name": "Test Project",
        "dimension": 2,
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0},
                "role": "input",
                "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
                "qubitIndex": 0,
            },
            {
                "id": "n1",
                "coordinate": {"x": 1, "y": 0},
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
    project = {
        "name": "Empty",
        "dimension": 2,
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
    project = {
        "name": "Test",
        "dimension": 2,
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0},
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
    project = {
        "name": "Test",
        "dimension": 2,
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0},
                "role": "input",
                "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
                "qubitIndex": 0,
            },
            {
                "id": "n1",
                "coordinate": {"x": 1, "y": 0},
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


async def test_validate_3d_project() -> None:
    """Test validation of a 3D project."""
    project = {
        "name": "3D Test",
        "dimension": 3,
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
