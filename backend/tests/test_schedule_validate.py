"""Schedule validation API endpoint tests."""

from typing import Any

from httpx import ASGITransport, AsyncClient
from src.main import app


def create_valid_schedule_project() -> tuple[dict[str, Any], dict[str, Any]]:
    """Create a project and valid schedule pair.

    Returns a linear chain: n0 (input) -> n1 (intermediate) -> n2 (output)
    with a valid schedule that respects all constraints.
    """
    project = {
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

    # Valid schedule: prepare n1, n2 at time 0, 1
    # Measure n0 at 1, n1 at 2 (n0 must be measured before n1 due to flow)
    # Entangle edges after their nodes are prepared but BEFORE measurement
    # Note: entangle time must be strictly less than measure time for both endpoints
    schedule = {
        "prepareTime": {"n1": 0, "n2": 1},
        "measureTime": {"n0": 1, "n1": 2},
        "entangleTime": {"n0-n1": 0, "n1-n2": 1},
        "timeline": [],
    }

    return project, schedule


async def test_validate_schedule_valid() -> None:
    """Test validation of a valid schedule."""
    project, schedule = create_valid_schedule_project()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["errors"] == []


async def test_validate_schedule_dag_violation() -> None:
    """Test validation catches DAG constraint violations.

    DAG constraint: if node u flows to node v, then measure_time[u] < measure_time[v].
    """
    project, schedule = create_valid_schedule_project()

    # Violate DAG: n0 should be measured before n1 (n0 flows to n1)
    # But we swap them: n0 measured at 1, n1 measured at 0
    schedule["measureTime"] = {"n0": 1, "n1": 0}

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0
    # Error should mention the violation
    error_messages = " ".join(e["message"] for e in data["errors"])
    assert "n0" in error_messages or "n1" in error_messages


async def test_validate_schedule_entangle_before_prepare() -> None:
    """Test validation catches entanglement before preparation."""
    project, schedule = create_valid_schedule_project()

    # Violate causality: entangle n1-n2 at time 0, but n2 is prepared at time 1
    schedule["entangleTime"] = {"n0-n1": 0, "n1-n2": 0}

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


async def test_validate_schedule_missing_prepare_time() -> None:
    """Test validation catches missing preparation times."""
    project, schedule = create_valid_schedule_project()

    # Remove a required prepare time (n2 must be prepared)
    schedule["prepareTime"] = {"n1": 0}  # Missing n2

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


async def test_validate_schedule_missing_measure_time() -> None:
    """Test validation catches missing measurement times."""
    project, schedule = create_valid_schedule_project()

    # Remove a required measure time (n1 must be measured)
    schedule["measureTime"] = {"n0": 0}  # Missing n1

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


async def test_validate_schedule_error_message_uses_node_ids() -> None:
    """Test that error messages use frontend node IDs, not internal indices."""
    project, schedule = create_valid_schedule_project()

    # Create an invalid schedule that will generate an error with node references
    schedule["measureTime"] = {"n0": 1, "n1": 0}  # DAG violation

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False

    # Error messages should contain node IDs like "n0", "n1", not indices like "0", "1"
    error_messages = " ".join(e["message"] for e in data["errors"])
    # Should not contain standalone indices (but may contain them as part of node IDs)
    assert "n0" in error_messages or "n1" in error_messages


async def test_validate_schedule_empty_project() -> None:
    """Test validation of an empty project with empty schedule."""
    project: dict[str, Any] = {
        "name": "Empty",
        "nodes": [],
        "edges": [],
        "flow": {"xflow": {}, "zflow": "auto"},
    }

    schedule: dict[str, Any] = {
        "prepareTime": {},
        "measureTime": {},
        "entangleTime": {},
        "timeline": [],
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    # Empty schedule should be valid
    assert data["valid"] is True


async def test_validate_schedule_input_node_in_prepare_time() -> None:
    """Test validation allows extra prepare_time for input nodes.

    graphqomb's validate_schedule does not reject input nodes in prepare_time;
    it treats them as extra (redundant but harmless) information.
    Input nodes are assumed to be prepared before time 0 anyway.
    """
    project, schedule = create_valid_schedule_project()

    # Input nodes can have prepare times (though they are redundant)
    schedule["prepareTime"]["n0"] = 0  # n0 is input

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    # This is allowed - input nodes can have prepare times (treated as extra info)
    assert data["valid"] is True


async def test_validate_schedule_output_node_in_measure_time() -> None:
    """Test validation allows extra measure_time for output nodes.

    graphqomb's validate_schedule does not reject output nodes in measure_time;
    it treats them as extra (redundant but harmless) information.
    Output nodes are not measured in MBQC (they preserve the final quantum state).
    """
    project, schedule = create_valid_schedule_project()

    # Output nodes can have measure times (though they are redundant)
    schedule["measureTime"]["n2"] = 3  # n2 is output

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/validate-schedule",
            json={"project": project, "schedule": schedule},
        )

    assert response.status_code == 200
    data = response.json()
    # This is allowed - output nodes can have measure times (treated as extra info)
    assert data["valid"] is True
