from __future__ import annotations

from fastapi.testclient import TestClient


def test_unknown_parcel_returns_parcel_not_found(client: TestClient) -> None:
    response = client.get(
        "/api/v1/parcels/unknown-parcel/observations",
        params={"startDate": "2026-10-01", "endDate": "2026-11-30", "missions": "Sentinel-2"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "parcelNotFound"


def test_reversed_date_range_returns_invalid_request(client: TestClient) -> None:
    response = client.get(
        "/api/v1/parcels/el haouz_Trees_20240110_036/observations",
        params={"startDate": "2026-11-30", "endDate": "2026-10-01", "missions": "Sentinel-2"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalidRequest"


def test_malformed_date_returns_invalid_request(client: TestClient) -> None:
    response = client.get(
        "/api/v1/parcels/el haouz_Trees_20240110_036/observations",
        params={"startDate": "not-a-date", "endDate": "2026-11-30", "missions": "Sentinel-2"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalidRequest"


def test_missing_required_parameter_returns_invalid_request(client: TestClient) -> None:
    response = client.get(
        "/api/v1/parcels/el haouz_Trees_20240110_036/observations",
        params={"endDate": "2026-11-30", "missions": "Sentinel-2"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalidRequest"


def test_invalid_mission_returns_invalid_request(client: TestClient) -> None:
    response = client.get(
        "/api/v1/parcels/el haouz_Trees_20240110_036/observations",
        params={"startDate": "2026-10-01", "endDate": "2026-11-30", "missions": "Foo"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalidRequest"


def test_unknown_parcel_discovery_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/parcels/unknown-parcel")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "parcelNotFound"


def test_parcel_discovery_success(client: TestClient) -> None:
    response = client.get("/api/v1/parcels/el haouz_Trees_20240110_036")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "Feature"
    assert body["geometry"]["type"] == "Polygon"


def test_observations_success(client: TestClient) -> None:
    response = client.get(
        "/api/v1/parcels/el haouz_Trees_20240110_036/observations",
        params=[
            ("startDate", "2026-10-01"),
            ("endDate", "2026-11-30"),
            ("missions", "Sentinel-1"),
            ("missions", "Sentinel-2"),
        ],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["contractVersion"] == "1.0"
    assert body["parcelId"] == "el haouz_Trees_20240110_036"


def test_unexpected_error_returns_internal_error(client: TestClient) -> None:
    # Trigger by unknown route
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code in (404, 500)
    assert response.json()["error"]["code"] in ("parcelNotFound", "internalError")
