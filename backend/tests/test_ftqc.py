"""FTQC compilation API tests."""

from typing import Any

from httpx import ASGITransport, AsyncClient
from src.main import app


def closure_project() -> dict[str, Any]:
    """Return a project whose second measurement depends on the first."""
    return {
        "name": "FTQC closure",
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
                "role": "intermediate",
                "measBasis": {"type": "axis", "axis": "Y", "sign": "PLUS"},
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
        "flow": {
            "xflow": {"n0": ["n1"], "n1": ["n2"]},
            "zflow": {"n0": ["n0"], "n1": ["n1"]},
        },
        "ftqc": {
            "parityCheckGroup": [["n1"]],
            "logicalObservableGroup": {"0": ["n1"]},
        },
    }


async def test_compile_ftqc_expands_detectors_and_logical_observables() -> None:
    """Detector and observable seeds are expanded through their dependent chains."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=closure_project())

    assert response.status_code == 200
    assert response.json() == {
        "parityCheckGroup": [["n0", "n1"]],
        "logicalObservableGroup": {"0": ["n0", "n1"]},
    }


async def test_compile_ftqc_resolves_auto_zflow() -> None:
    """Projects using Studio's automatic z-flow can compile closure groups."""
    project = closure_project()
    project["flow"]["zflow"] = "auto"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 200
    assert response.json()["parityCheckGroup"] == [["n0", "n1"]]


async def test_compile_ftqc_rejects_unknown_detector_node() -> None:
    """Invalid detector node references are rejected at the request boundary."""
    project = closure_project()
    project["ftqc"]["parityCheckGroup"] = [["missing"]]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 422


async def test_compile_ftqc_rejects_unknown_logical_observable_node() -> None:
    """Invalid logical-observable node references are rejected at the request boundary."""
    project = closure_project()
    project["ftqc"]["logicalObservableGroup"] = {"0": ["missing"]}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 422
