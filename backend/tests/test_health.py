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
