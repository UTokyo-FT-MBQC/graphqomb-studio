"""Tests for importing GraphQOMB .ptn files."""

import json
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from src import cli
from src.main import app
from src.services import import_sessions
from src.services.ptn_import import ptn_text_to_project


def simple_ptn() -> str:
    """Return a small .ptn pattern with no coordinates."""
    return """# GraphQOMB Pattern Format v1
.version 1
.input 0:0
.output 2:0

[0]
N 1
N 2
E 0 1
E 1 2
[1]
M 0 X +
[2]
M 1 XY pi/2
X 2
Z 2

.xflow 0 -> 1
.xflow 1 -> 2
.zflow 0 -> 0
.zflow 1 -> 1
"""


def measured_output_ptn() -> str:
    """Return a PTN pattern whose output node is measured."""
    return simple_ptn().replace("[2]\nM 1 XY pi/2", "[2]\nM 1 XY pi/2\nM 2 X +")


def to_payload(project: dict[str, Any]) -> dict[str, Any]:
    """Return API payload fields from a full Studio project."""
    return {key: value for key, value in project.items() if key not in {"$schema", "schedule"}}


def test_ptn_text_to_project_imports_graph_with_layout() -> None:
    """PTN text is converted into a valid Studio project shape."""
    project = ptn_text_to_project(simple_ptn(), name="sample")

    assert project["$schema"] == "graphqomb-studio/v1"
    assert project["name"] == "sample"
    assert [node["id"] for node in project["nodes"]] == ["n0", "n1", "n2"]
    assert project["nodes"][0]["role"] == "input"
    assert project["nodes"][1]["role"] == "intermediate"
    assert project["nodes"][2]["role"] == "output"
    assert project["edges"] == [
        {"id": "n0-n1", "source": "n0", "target": "n1"},
        {"id": "n1-n2", "source": "n1", "target": "n2"},
    ]
    assert project["flow"] == {
        "xflow": {"n0": ["n1"], "n1": ["n2"]},
        "zflow": {"n0": ["n0"], "n1": ["n1"]},
    }
    assert all(node["coordinate"]["z"] == 0.0 for node in project["nodes"])
    assert project["schedule"]["measureTime"] == {"n0": 1, "n1": 2, "n2": None}


def test_ptn_text_to_project_imports_measured_output() -> None:
    """Measured output nodes are represented as outputs with a measurement basis."""
    project = ptn_text_to_project(measured_output_ptn())

    output_node = project["nodes"][2]
    assert output_node["role"] == "output"
    assert output_node["qubitIndex"] == 0
    assert output_node["measBasis"] == {"type": "axis", "axis": "X", "sign": "PLUS"}
    assert project["schedule"]["measureTime"]["n2"] == 2


async def test_measured_output_import_is_accepted_by_validate_api() -> None:
    """Projects imported with measured outputs are accepted by the validation API."""
    project = ptn_text_to_project(measured_output_ptn())

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/api/validate", json=to_payload(project))

    assert response.status_code == 200
    assert response.json() == {"valid": True, "errors": []}


async def test_import_session_endpoint(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Import session endpoint returns projects created by the CLI handoff store."""
    monkeypatch.setattr(import_sessions, "IMPORT_SESSION_DIR", tmp_path)
    project = ptn_text_to_project(simple_ptn())
    token = import_sessions.create_import_session(project)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get(f"/api/import-session/{token}")

    assert response.status_code == 200
    assert response.json()["nodes"] == project["nodes"]


async def test_import_session_endpoint_rejects_invalid_token() -> None:
    """Import session endpoint rejects non-UUID tokens."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/import-session/not-a-token")

    assert response.status_code == 400


def test_cli_view_writes_json_and_prints_url(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    """CLI view command can convert without starting servers when they are already healthy."""
    ptn_path = tmp_path / "sample.ptn"
    json_path = tmp_path / "sample.json"
    ptn_path.write_text(simple_ptn(), encoding="utf-8")
    monkeypatch.setattr(import_sessions, "IMPORT_SESSION_DIR", tmp_path / "sessions")

    def is_healthy(_url: str) -> bool:
        return True

    monkeypatch.setattr(cli, "_backend_is_healthy", is_healthy)
    monkeypatch.setattr(cli, "_url_is_healthy", is_healthy)

    exit_code = cli.main(["view", str(ptn_path), "--no-open", "--json-out", str(json_path)])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "http://127.0.0.1:3000/?importToken=" in captured.out
    data: dict[str, Any] = json.loads(json_path.read_text(encoding="utf-8"))
    assert data["name"] == "sample"
