"""Health check endpoint tests."""

from httpx import ASGITransport, AsyncClient
from src.main import app


async def test_health_check() -> None:
    """Test health check endpoint returns ok status."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_health_check_method_not_allowed() -> None:
    """Test health check endpoint rejects POST method."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/health")

    assert response.status_code == 405


async def test_cors_allows_cli_frontend_origin() -> None:
    """CLI-opened frontend origins can fetch backend API routes."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.options(
            "/api/import-session/token",
            headers={
                "Origin": "http://127.0.0.1:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"


async def test_cors_allows_custom_local_frontend_port() -> None:
    """Custom CLI frontend ports are also valid local development origins."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.options(
            "/api/import-session/token",
            headers={
                "Origin": "http://localhost:3010",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3010"
