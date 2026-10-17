"""PTN v5 Clifford-flow import and API regression tests."""

from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app
from src.services.ptn_import import ptn_text_to_project


def cflow_ptn(gate: str = "H") -> str:
    """Return a measured chain whose only correction dependency is cflow."""
    return f""".version 5
[0]
N 0
N 1
N 2
E 0 1
E 1 2
[1]
M 0 X +
[2]
M 1 XY pi/4
[3]
M 2 X +
.cflow 0 -> 1:{gate}
"""


def cflow_payload() -> dict[str, Any]:
    """Import through the real parser and return the API payload."""
    project = ptn_text_to_project(cflow_ptn())
    return {key: value for key, value in project.items() if key not in {"$schema", "schedule"}}


@pytest.mark.parametrize("gate", ["H", "S", "SH", "HS", "HSH"])
def test_import_preserves_v5_correcting_gate(gate: str) -> None:
    """Keep the correcting coset, rather than replacing it with its inverse."""
    project = ptn_text_to_project(cflow_ptn(gate))

    assert project["flow"]["cflow"] == {"n0": {"n1": gate}}
    assert project["flow"]["xflow"] == {}
    assert project["flow"]["zflow"] == {}
    assert project["schedule"]["measureTime"] == {"n0": 1, "n1": 2, "n2": 3}


async def test_v5_import_endpoint_and_validation() -> None:
    """Browser import preserves cflow and produces a valid API payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        imported = await client.post("/api/import-ptn", json={"text": cflow_ptn("SH"), "name": "v5"})
        assert imported.status_code == 200
        assert imported.json()["flow"]["cflow"] == {"n0": {"n1": "SH"}}
        response = await client.post("/api/validate", json=cflow_payload())

    assert response.status_code == 200
    assert response.json() == {"valid": True, "errors": []}


@pytest.mark.parametrize("use_greedy", [True, False])
async def test_scheduler_respects_cflow_only_dependency(use_greedy: bool) -> None:
    """Both scheduling strategies order measurements linked only by cflow."""
    project = cflow_payload()
    # Reverse node-index order so a solver cannot pass by relying on node IDs.
    project["flow"]["cflow"] = {"n1": {"n0": "H"}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"/api/schedule?use_greedy={str(use_greedy).lower()}", json=project)
        assert response.status_code == 200
        schedule = response.json()
        assert schedule["measureTime"]["n1"] < schedule["measureTime"]["n0"]
        valid = await client.post("/api/validate-schedule", json={"project": project, "schedule": schedule})
        assert valid.json() == {"valid": True, "errors": []}

        # Keep entanglement timing valid while violating the cflow dependency.
        schedule["measureTime"]["n1"] = schedule["measureTime"]["n0"]
        invalid = await client.post("/api/validate-schedule", json={"project": project, "schedule": schedule})

    assert invalid.status_code == 200
    assert invalid.json()["valid"] is False
    assert "n1" in str(invalid.json()["errors"])
    assert "n0" in str(invalid.json()["errors"])


@pytest.mark.parametrize(
    "cflow",
    [{"missing": {"n1": "H"}}, {"n0": {"missing": "H"}}, {"n0": {"n1": "X"}}],
)
async def test_api_rejects_invalid_clifford_references_and_gates(cflow: dict[str, dict[str, str]]) -> None:
    """Malformed cflow cannot silently disappear at the DTO boundary."""
    project = cflow_payload()
    project["flow"]["cflow"] = cflow
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/validate", json=project)

    assert response.status_code == 422
    assert "cflow" in str(response.json()["detail"])


@pytest.mark.parametrize(
    ("cflow", "message"),
    [
        ({"n0": {"n1": "H"}, "n1": {"n0": "H"}}, "cycle"),
        ({"n0": {"n2": "H"}, "n1": {"n2": "S"}}, "do not commute"),
    ],
)
async def test_validation_and_scheduling_reject_invalid_clifford_flow(
    cflow: dict[str, dict[str, str]], message: str
) -> None:
    """Reject cycles and corrections whose order changes the computation."""
    project = cflow_payload()
    project["flow"]["cflow"] = cflow
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        validation = await client.post("/api/validate", json=project)
        schedule = await client.post("/api/schedule", json=project)

    assert validation.json()["valid"] is False
    assert message in str(validation.json()["errors"]).lower()
    assert schedule.status_code == 400
    assert message in schedule.json()["detail"].lower()


async def test_ftqc_reports_unsupported_clifford_certification() -> None:
    """Do not certify a cflow-affected detector using a Pauli-only frame."""
    project = cflow_payload()
    project["ftqc"] = {"parityCheckGroup": [["n1"]], "logicalObservableGroup": {}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 200
    result = response.json()
    assert result["parityCheckGroup"] == [["n1"]]
    assert result["flow"]["cflow"] == project["flow"]["cflow"]
    diagnostic = result["detectorDiagnostics"][0]
    assert diagnostic["deterministic"] is None
    assert "Clifford feedforward (cflow)" in diagnostic["unsupportedReason"]


async def test_cflow_can_correct_an_unmeasured_output_but_not_use_it_as_source() -> None:
    """Outputs can receive correcting gates but cannot supply measurement results."""
    project = cflow_payload()
    project["nodes"][2].update(role="output", qubitIndex=0)
    del project["nodes"][2]["measBasis"]
    project["flow"]["cflow"] = {"n0": {"n2": "SH"}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        valid = await client.post("/api/validate", json=project)
        assert valid.json() == {"valid": True, "errors": []}
        schedule = await client.post("/api/schedule", json=project)
        assert schedule.status_code == 200
        assert "n2" not in schedule.json()["measureTime"]

        project["flow"]["cflow"] = {"n2": {"n0": "SH"}}
        invalid = await client.post("/api/validate", json=project)

    assert invalid.json()["valid"] is False
    assert "source" in str(invalid.json()["errors"]).lower()


async def test_auto_zflow_keeps_cflow_in_validation_and_schedule() -> None:
    """Resolve automatic Pauli flow alongside the independent Clifford map."""
    project = cflow_payload()
    project["flow"] = {"xflow": {"n0": ["n1"]}, "zflow": "auto", "cflow": {"n1": {"n2": "S"}}}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        zflow = await client.post("/api/compute-zflow", json=project)
        assert zflow.status_code == 200
        assert sorted(zflow.json()["n0"]) == ["n0", "n2"]
        validation = await client.post("/api/validate", json=project)
        assert validation.json() == {"valid": True, "errors": []}
        schedule = await client.post("/api/schedule", json=project)

    assert schedule.status_code == 200
    times = schedule.json()["measureTime"]
    assert times["n0"] < times["n1"] < times["n2"]
