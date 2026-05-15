"""PTN import/export API endpoint tests."""

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app

pytest.importorskip("graphqomb.ptn_format")


def create_ptn_project() -> dict[str, Any]:
    """Create a small project for PTN export tests."""
    return {
        "name": "PTN Project",
        "nodes": [
            {
                "id": "n0",
                "coordinate": {"x": 0, "y": 0, "z": 0},
                "role": "input",
                "measBasis": {"type": "axis", "axis": "X", "sign": "PLUS"},
                "qubitIndex": 0,
            },
            {
                "id": "n1",
                "coordinate": {"x": 1, "y": 0, "z": 0},
                "role": "output",
                "measBasis": {"type": "axis", "axis": "Y", "sign": "MINUS"},
                "qubitIndex": 0,
            },
        ],
        "edges": [{"id": "n0-n1", "source": "n0", "target": "n1"}],
        "flow": {"xflow": {"n0": ["n1"]}, "zflow": {"n0": ["n0"]}},
        "ftqc": {"parityCheckGroup": [["n0"]], "logicalObservableGroup": {"0": ["n1"]}},
    }


async def test_export_ptn_auto_schedule() -> None:
    """Test exporting a project to graphqomb PTN."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/ptn/export",
            json={"project": create_ptn_project()},
        )

    assert response.status_code == 200, response.json()
    content = response.json()["content"]
    assert ".version 1" in content
    assert ".input 0:0" in content
    assert ".output 1:0" in content
    assert ".xflow 0 -> 1" in content
    assert ".zflow 0 -> 0" in content
    assert ".detector 0" in content
    assert ".observable 0 -> 1" in content


async def test_export_ptn_uses_provided_schedule() -> None:
    """Test exporting with an existing Studio schedule."""
    schedule = {
        "prepareTime": {"n1": 0},
        "measureTime": {"n0": 1, "n1": 2},
        "entangleTime": {"n0-n1": 0},
        "timeline": [
            {"time": 0, "prepareNodes": [], "entangleEdges": ["n0-n1"], "measureNodes": []},
            {"time": 1, "prepareNodes": [], "entangleEdges": [], "measureNodes": ["n0"]},
            {"time": 2, "prepareNodes": [], "entangleEdges": [], "measureNodes": ["n1"]},
        ],
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/ptn/export",
            json={"project": create_ptn_project(), "schedule": schedule},
        )

    assert response.status_code == 200, response.json()
    content = response.json()["content"]
    assert "E 0 1" in content
    assert "[1]\nM 0 X +" in content


async def test_import_ptn_with_measured_output() -> None:
    """Test importing PTN preserves measured output basis and metadata."""
    ptn = """
.version 1
.input 0:0
.output 1:0
.coord 0 0.0 0.0

[0]
E 0 1
[1]
M 0 X +
[2]
M 1 Y -

.xflow 0 -> 1
.zflow 0 -> 0
.detector 0
.observable 0 -> 1
"""

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/ptn/import",
            json={"content": ptn, "name": "imported"},
        )

    assert response.status_code == 200, response.json()
    data = response.json()
    project = data["project"]
    assert project["name"] == "imported"
    assert project["flow"] == {"xflow": {"0": ["1"]}, "zflow": {"0": ["0"]}}
    assert project["ftqc"] == {
        "parityCheckGroup": [["0"]],
        "logicalObservableGroup": {"0": ["1"]},
    }

    output_node = next(node for node in project["nodes"] if node["id"] == "1")
    assert output_node["role"] == "output"
    assert output_node["measBasis"] == {"type": "axis", "axis": "Y", "sign": "MINUS"}

    schedule = data["schedule"]
    assert schedule["entangleTime"] == {"0-1": 0}
    assert schedule["measureTime"] == {"0": 1, "1": 2}


async def test_import_ptn_rejects_invalid_content() -> None:
    """Test invalid PTN returns a 400."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/ptn/import",
            json={"content": ".input 0:0\n", "name": "bad"},
        )

    assert response.status_code == 400
    assert "PTN import failed" in response.json()["detail"]
