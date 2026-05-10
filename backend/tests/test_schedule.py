"""Schedule API endpoint tests."""

from typing import Any

import pytest
from graphqomb.schedule_solver import ScheduleConfig
from httpx import ASGITransport, AsyncClient
from src.main import app
from src.routers import schedule as schedule_router


def create_schedulable_project() -> dict[str, Any]:
    """Create a project that can be scheduled."""
    return {
        "name": "Schedulable Project",
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


async def test_schedule_valid_project() -> None:
    """Test scheduling a valid project."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/schedule", json=create_schedulable_project())

    assert response.status_code == 200
    data = response.json()

    # Check response structure
    assert "prepareTime" in data
    assert "measureTime" in data
    assert "entangleTime" in data
    assert "timeline" in data

    # Check timeline structure
    assert isinstance(data["timeline"], list)
    if len(data["timeline"]) > 0:
        first_slice = data["timeline"][0]
        assert "time" in first_slice
        assert "prepareNodes" in first_slice
        assert "entangleEdges" in first_slice
        assert "measureNodes" in first_slice


async def test_schedule_with_strategy() -> None:
    """Test scheduling with different strategies."""
    project = create_schedulable_project()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # Test MINIMIZE_SPACE strategy
        response = await client.post(
            "/api/schedule?strategy=MINIMIZE_SPACE",
            json=project,
        )
        assert response.status_code == 200

        # Test MINIMIZE_TIME strategy
        response = await client.post(
            "/api/schedule?strategy=MINIMIZE_TIME",
            json=project,
        )
        assert response.status_code == 200


async def test_schedule_with_performance_controls() -> None:
    """Test scheduling with greedy mode and resource limits."""
    project = create_schedulable_project()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/schedule?strategy=MINIMIZE_TIME&use_greedy=true&max_time=10&max_qubit_count=3",
            json=project,
        )

    assert response.status_code == 200
    data = response.json()
    assert "timeline" in data


async def test_schedule_rejects_too_small_max_time() -> None:
    """Test scheduling fails when max_time is too small."""
    project = create_schedulable_project()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/schedule?strategy=MINIMIZE_TIME&use_greedy=true&max_time=1",
            json=project,
        )

    assert response.status_code == 400


async def test_schedule_passes_max_qubit_count_to_solver(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test max_qubit_count is passed through to graphqomb ScheduleConfig."""
    project = create_schedulable_project()
    captured_config: dict[str, ScheduleConfig] = {}

    class FakeScheduler:
        def __init__(self, _graph: Any, _xflow: Any, _zflow: Any) -> None:
            self.prepare_time: dict[int, int | None] = {}
            self.measure_time: dict[int, int | None] = {}
            self.entangle_time: dict[tuple[int, int], int | None] = {}
            self.timeline: list[Any] = []

        def solve_schedule(self, config: ScheduleConfig, timeout: int) -> bool:
            assert timeout == 60
            captured_config["config"] = config
            return True

    monkeypatch.setattr(schedule_router, "Scheduler", FakeScheduler)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/schedule?strategy=MINIMIZE_SPACE&max_qubit_count=1",
            json=project,
        )

    assert response.status_code == 200
    assert captured_config["config"].max_qubit_count == 1


async def test_schedule_rejects_invalid_performance_limits() -> None:
    """Test scheduling rejects non-positive performance limits."""
    project = create_schedulable_project()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/schedule?max_time=0", json=project)
        assert response.status_code == 422

        response = await client.post("/api/schedule?max_qubit_count=0", json=project)
        assert response.status_code == 422


async def test_schedule_empty_project() -> None:
    """Test scheduling an empty project."""
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
        response = await client.post("/api/schedule", json=project)

    # Empty project should still return a valid (empty) schedule
    assert response.status_code == 200
    data = response.json()
    assert data["prepareTime"] == {}
    assert data["measureTime"] == {}
    assert data["entangleTime"] == {}


async def test_schedule_invalid_strategy() -> None:
    """Test scheduling with invalid strategy."""
    project = create_schedulable_project()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/schedule?strategy=INVALID",
            json=project,
        )

    # Should fail with 422 (validation error)
    assert response.status_code == 422


async def test_schedule_returns_node_ids() -> None:
    """Test that schedule returns frontend node IDs, not internal indices."""
    project = create_schedulable_project()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/schedule", json=project)

    assert response.status_code == 200
    data = response.json()

    # Check that returned IDs are the frontend node IDs
    all_node_ids = {"n0", "n1", "n2"}
    for node_id in data["prepareTime"]:
        assert node_id in all_node_ids

    for node_id in data["measureTime"]:
        assert node_id in all_node_ids

    # Check edge IDs are normalized
    for edge_id in data["entangleTime"]:
        assert "-" in edge_id
        parts = edge_id.split("-")
        assert len(parts) == 2
