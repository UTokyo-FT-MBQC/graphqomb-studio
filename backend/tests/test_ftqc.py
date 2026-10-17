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
            "parityCheckTags": ["type=flag"],
            "logicalObservableGroup": {"0": ["n1"]},
        },
    }


def single_node_project(meas_basis: dict[str, Any], *, input_basis: str | None = None) -> dict[str, Any]:
    """Return a one-node detector project with a configurable measurement."""
    node: dict[str, Any] = {
        "id": "n0",
        "coordinate": {"x": 0, "y": 0, "z": 0},
        "role": "input",
        "measBasis": meas_basis,
        "qubitIndex": 0,
    }
    if input_basis is not None:
        node["inputBasis"] = input_basis
    return {
        "name": "Single-node detector",
        "nodes": [node],
        "edges": [],
        "flow": {"xflow": {}, "zflow": {}},
        "ftqc": {
            "parityCheckGroup": [["n0"]],
            "logicalObservableGroup": {},
        },
    }


async def test_compile_ftqc_retains_quantum_output_ancestors_with_matching_supports() -> None:
    """Output ancestors stay adaptive, so their corrections are not counted twice."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=closure_project())

    assert response.status_code == 200
    assert response.json() == {
        "parityCheckGroup": [["n1"]],
        "parityCheckTags": ["type=flag"],
        "logicalObservableGroup": {"0": ["n1"]},
        "flow": {
            "xflow": {"n0": ["n1"], "n1": ["n2"]},
            "zflow": {"n0": ["n0"], "n1": ["n1"]},
            "cflow": {},
        },
        "detectorDiagnostics": [
            {
                "deterministic": False,
                "unsupportedReason": None,
                "mismatches": [
                    {
                        "nodeId": "n0",
                        "stabilizerAxis": "Y",
                        "detectorMeasurementAxis": "X",
                        "configuredMeasurementAxis": "X",
                        "measurementPlane": "XY",
                        "measurementAngleCoeff": 0.0,
                        "reason": "axis-mismatch",
                    }
                ],
            }
        ],
    }


async def test_compile_ftqc_reports_z_measurement_support_mismatch() -> None:
    """A lone Z measurement on an X-initialized node is non-deterministic in GraphQOMB 0.5.2."""
    project = single_node_project({"type": "axis", "axis": "Z", "sign": "PLUS"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 200
    assert response.json()["detectorDiagnostics"] == [
        {
            "deterministic": False,
            "unsupportedReason": None,
            "mismatches": [
                {
                    "nodeId": "n0",
                    "stabilizerAxis": None,
                    "detectorMeasurementAxis": "Z",
                    "configuredMeasurementAxis": "Z",
                    "measurementPlane": "XZ",
                    "measurementAngleCoeff": 0.0,
                    "reason": "missing-stabilizer-support",
                }
            ],
        }
    ]


async def test_compile_ftqc_reports_stabilizer_support_outside_detector_group() -> None:
    """A Pauli-equivalent planner basis outside the detector is reported as its Pauli axis."""
    project = single_node_project({"type": "axis", "axis": "X", "sign": "PLUS"})
    project["nodes"].append(
        {
            "id": "n1",
            "coordinate": {"x": 1, "y": 0, "z": 0},
            "role": "intermediate",
            "measBasis": {"type": "planner", "plane": "XY", "angleCoeff": 0},
        }
    )
    project["edges"] = [{"id": "n0-n1", "source": "n0", "target": "n1"}]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 200
    assert response.json()["detectorDiagnostics"] == [
        {
            "deterministic": False,
            "unsupportedReason": None,
            "mismatches": [
                {
                    "nodeId": "n1",
                    "stabilizerAxis": "Z",
                    "detectorMeasurementAxis": None,
                    "configuredMeasurementAxis": "X",
                    "measurementPlane": "XY",
                    "measurementAngleCoeff": 0.0,
                    "reason": "missing-measurement-support",
                }
            ],
        }
    ]


async def test_compile_ftqc_preserves_non_pauli_group_without_claiming_certification() -> None:
    """A non-Pauli group compiles, with an explicit unavailable certificate."""
    project = single_node_project({"type": "planner", "plane": "XY", "angleCoeff": 0.125})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 200
    assert response.json()["parityCheckGroup"] == [["n0"]]
    diagnostic = response.json()["detectorDiagnostics"][0]
    assert diagnostic["deterministic"] is None
    assert diagnostic["mismatches"] == []
    assert "measurement axis" in diagnostic["unsupportedReason"]


async def test_compile_ftqc_reports_deterministic_detector_without_mismatches() -> None:
    """Matching preparation and measurement support yields a clean diagnostic."""
    project = single_node_project(
        {"type": "axis", "axis": "Z", "sign": "PLUS"},
        input_basis="Z",
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 200
    assert response.json()["detectorDiagnostics"] == [
        {"deterministic": True, "mismatches": [], "unsupportedReason": None}
    ]


async def test_compile_ftqc_resolves_auto_zflow() -> None:
    """Projects using Studio's automatic z-flow retain quantum-output ancestors."""
    project = closure_project()
    project["flow"]["zflow"] = "auto"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 200
    assert response.json()["parityCheckGroup"] == [["n1"]]


async def test_compile_ftqc_absorbs_removable_feedback_into_both_parity_types() -> None:
    project = closure_project()
    project["nodes"][2]["measBasis"] = {"type": "axis", "axis": "X", "sign": "PLUS"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)
    assert response.status_code == 200
    assert response.json()["parityCheckGroup"] == [["n0", "n1"]]
    assert response.json()["logicalObservableGroup"] == {"0": ["n0", "n1"]}
    assert response.json()["flow"] == {"xflow": {}, "zflow": {"n0": ["n0"], "n1": ["n1"]}, "cflow": {}}


async def test_compile_ftqc_keeps_cflow_and_certifies_independent_detectors() -> None:
    project = closure_project()
    project["flow"]["cflow"] = {"n0": {"n1": "S"}}
    project["ftqc"]["parityCheckGroup"].append(["n0"])
    project["ftqc"]["parityCheckTags"].append("")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)
    assert response.status_code == 200
    result = response.json()
    assert result["parityCheckGroup"] == [["n1"], ["n0"]]
    assert result["logicalObservableGroup"] == {"0": ["n1"]}
    assert result["flow"]["cflow"] == {"n0": {"n1": "S"}}
    assert result["flow"]["xflow"] == project["flow"]["xflow"]
    unsupported, independent = result["detectorDiagnostics"]
    assert unsupported["deterministic"] is None
    assert unsupported["mismatches"] == []
    assert "Clifford feedforward" in unsupported["unsupportedReason"]
    assert independent["deterministic"] is False
    assert independent["unsupportedReason"] is None


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


async def test_compile_ftqc_rejects_misaligned_detector_tags() -> None:
    """Detector tags must stay aligned with parity check groups."""
    project = closure_project()
    project["ftqc"]["parityCheckTags"] = ["type=flag", ""]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/compile-ftqc", json=project)

    assert response.status_code == 422
