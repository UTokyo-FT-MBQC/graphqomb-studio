"""Command line entrypoint for GraphQOMB Studio."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path
from typing import TYPE_CHECKING, Any, NoReturn

from pydantic import TypeAdapter, ValidationError

if TYPE_CHECKING:
    from collections.abc import Callable

from src.services.ptn_import import load_ptn_project

DEFAULT_BACKEND_PORT = 8000
DEFAULT_FRONTEND_PORT = 3000
LOCAL_HOST = "localhost"
SERVER_TIMEOUT_SECONDS = 120.0
IMPORT_SESSION_RESPONSE_ADAPTER = TypeAdapter(dict[str, str])


def main(argv: list[str] | None = None) -> int:
    """Run the GraphQOMB Studio CLI."""
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.command == "view":
        return _view(args)
    parser.print_help()
    return 1


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="gqomb-vis")
    subparsers = parser.add_subparsers(dest="command")

    view_parser = subparsers.add_parser("view", help="Open a .ptn file in GraphQOMB Studio")
    view_parser.add_argument("ptn_path", type=Path)
    view_parser.add_argument("--backend-port", type=int, default=DEFAULT_BACKEND_PORT)
    view_parser.add_argument("--frontend-port", type=int, default=DEFAULT_FRONTEND_PORT)
    view_parser.add_argument("--no-open", action="store_true", help="Print the URL without opening a browser")
    view_parser.add_argument("--json-out", type=Path, help="Write converted Studio JSON to this path")
    return parser


def _view(args: argparse.Namespace) -> int:
    project = load_ptn_project(args.ptn_path)
    if args.json_out is not None:
        args.json_out.write_text(json.dumps(project, indent=2), encoding="utf-8")

    backend_url = f"http://{LOCAL_HOST}:{args.backend_port}"
    frontend_url = f"http://{LOCAL_HOST}:{args.frontend_port}"

    processes: list[subprocess.Popen[str]] = []
    try:
        if not _backend_is_healthy(backend_url):
            processes.append(_start_backend(args.backend_port))
            _wait_until(lambda: _backend_is_healthy(backend_url), f"backend at {backend_url}")

        token = _create_remote_import_session(backend_url, project)
        import_url = _import_url(frontend_url, token)

        if not _url_is_healthy(frontend_url):
            processes.append(_start_frontend(args.frontend_port, backend_url))
            _wait_until(lambda: _url_is_healthy(frontend_url), f"frontend at {frontend_url}")

        print(import_url)
        if not args.no_open:
            print("If the browser does not open automatically, open the URL above.", file=sys.stderr)
            webbrowser.open(import_url)

        if processes:
            _wait_for_interrupt(processes)
    finally:
        for process in processes:
            _terminate_process(process)
    return 0


def _backend_is_healthy(base_url: str) -> bool:
    return _url_is_healthy(f"{base_url}/health")


def _import_url(frontend_url: str, token: str) -> str:
    query = urllib.parse.urlencode({"importToken": token})
    return f"{frontend_url}/?{query}"


def _create_remote_import_session(base_url: str, project: dict[str, Any]) -> str:
    request = urllib.request.Request(
        f"{base_url}/api/import-session",
        data=json.dumps(project).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10.0) as response:
            payload = IMPORT_SESSION_RESPONSE_ADAPTER.validate_json(response.read())
    except (OSError, urllib.error.URLError, ValidationError) as exc:
        _die(f"Failed to create import session on backend at {base_url}: {exc}")

    token = payload.get("token", "")
    if token == "":
        _die(f"Backend at {base_url} returned an invalid import session token")
    return token


def _url_is_healthy(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=1.0) as response:
            return 200 <= response.status < 500
    except (OSError, urllib.error.URLError):
        return False


def _start_backend(port: int) -> subprocess.Popen[str]:
    backend_dir = Path(__file__).resolve().parents[1]
    return subprocess.Popen(
        ["uv", "run", "uvicorn", "src.main:app", "--host", LOCAL_HOST, "--port", str(port)],
        cwd=backend_dir,
        text=True,
    )


def _start_frontend(port: int, backend_url: str) -> subprocess.Popen[str]:
    frontend_dir = _frontend_dir()
    _ensure_frontend_dependencies(frontend_dir)
    env = os.environ.copy()
    env["NEXT_PUBLIC_API_URL"] = backend_url
    return subprocess.Popen(
        ["pnpm", "dev", "--hostname", LOCAL_HOST, "--port", str(port)],
        cwd=frontend_dir,
        env=env,
        text=True,
    )


def _frontend_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "frontend"


def _ensure_frontend_dependencies(frontend_dir: Path) -> None:
    if shutil.which("pnpm") is None:
        _die("pnpm is required to start the frontend. Install pnpm 10+ and run `pnpm install` in frontend/.")
    if not (frontend_dir / "node_modules").is_dir():
        _die(
            "Frontend dependencies are not installed. Run `cd frontend && pnpm install` before using `gqomb-vis view`.",
        )


def _wait_until(check: Callable[[], bool], description: str) -> None:
    deadline = time.monotonic() + SERVER_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        if check():
            return
        time.sleep(0.25)
    _die(f"Timed out waiting for {description}")


def _wait_for_interrupt(processes: list[subprocess.Popen[str]]) -> None:
    try:
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
    except KeyboardInterrupt:
        return


def _terminate_process(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.send_signal(signal.SIGTERM)
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def _die(message: str) -> NoReturn:
    print(message, file=sys.stderr)
    raise SystemExit(1)


if __name__ == "__main__":
    raise SystemExit(main())
