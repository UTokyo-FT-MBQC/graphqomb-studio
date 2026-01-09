"""Flow API endpoint tests."""

from typing import Any

from httpx import ASGITransport, AsyncClient
from src.main import app


def create_project_with_xflow() -> dict[str, Any]:
    """Create a project with xflow for testing zflow computation."""
    return {
        "name": "Flow Test",
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
                "role": "intermediate",
                "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
            },
            {
                "id": "n2",
                "coordinate": {"x": 2, "y": 0, "z": 0},
                "role": "output",
                "qubitIndex": 0,
            },
        ],
        "edges": [
            {"id": "n0-n1", "source": "n0", "target": "n1"},
            {"id": "n1-n2", "source": "n1", "target": "n2"},
        ],
        "flow": {"xflow": {"n0": ["n1"], "n1": ["n2"]}, "zflow": "auto"},
    }


async def test_compute_zflow() -> None:
    """Test computing zflow from xflow."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/compute-zflow", json=create_project_with_xflow())

    assert response.status_code == 200
    data = response.json()

    # Should return a dict with node IDs as keys
    assert isinstance(data, dict)

    # Keys should be frontend node IDs
    for key in data:
        assert key in {"n0", "n1", "n2"}

    # Values should be lists of node IDs
    for value in data.values():
        assert isinstance(value, list)


async def test_compute_zflow_empty_xflow() -> None:
    """Test computing zflow with empty xflow."""
    project = {
        "name": "Empty Flow",
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
        "flow": {"xflow": {}, "zflow": "auto"},
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/compute-zflow", json=project)

    assert response.status_code == 200
    data = response.json()

    # Empty xflow should result in empty zflow
    assert data == {}


async def test_compute_zflow_empty_project() -> None:
    """Test computing zflow for empty project."""
    project = {
        "name": "Empty",
        "nodes": [],
        "edges": [],
        "flow": {"xflow": {}, "zflow": "auto"},
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/compute-zflow", json=project)

    assert response.status_code == 200
    data = response.json()
    assert data == {}


async def test_compute_zflow_multi_z_project() -> None:
    """Test computing zflow for project with nodes at different Z levels."""
    project = {
        "name": "Multi-Z Flow Test",
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
                "role": "intermediate",
                "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
            },
            {
                "id": "n2",
                "coordinate": {"x": 2, "y": 0, "z": 0},
                "role": "output",
                "qubitIndex": 0,
            },
        ],
        "edges": [
            {"id": "n0-n1", "source": "n0", "target": "n1"},
            {"id": "n1-n2", "source": "n1", "target": "n2"},
        ],
        "flow": {"xflow": {"n0": ["n1"], "n1": ["n2"]}, "zflow": "auto"},
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/compute-zflow", json=project)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
