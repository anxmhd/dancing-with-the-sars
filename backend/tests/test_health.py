from __future__ import annotations

from fastapi.testclient import TestClient

from dancing_with_sars import __version__


def test_health_reports_service_status(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {
        "status": "ok",
        "service": "dancing-with-the-sars-backend",
        "version": __version__,
        "scienceProvider": "mock",
    }


def test_health_route_is_documented_in_openapi(client: TestClient) -> None:
    paths = client.get("/api/v1/openapi.json").json()["paths"]

    assert "/api/v1/health" in paths
    assert paths["/api/v1/health"]["get"]["operationId"] == "getHealth"
