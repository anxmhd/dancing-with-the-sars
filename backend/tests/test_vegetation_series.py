from __future__ import annotations

from typing import Any

from conftest import DEFAULT_QUERY, VEGETATION_SERIES_PATH
from fastapi.testclient import TestClient


def _series(
    client: TestClient,
    parcel_id: str,
    query: dict[str, str] | None = None,
) -> Any:
    return client.get(
        VEGETATION_SERIES_PATH.format(parcel_id=parcel_id),
        params=DEFAULT_QUERY if query is None else query,
    )


def test_series_response_matches_shared_contract_fixture(
    client: TestClient, shared_fixture: dict[str, Any]
) -> None:
    response = _series(client, "synthetic-parcel-001")

    assert response.status_code == 200
    assert response.json() == shared_fixture


def test_series_uses_camel_case_and_contract_fields(client: TestClient) -> None:
    body = _series(client, "synthetic-parcel-001").json()

    assert set(body) == {
        "parcelId",
        "index",
        "unit",
        "startDate",
        "endDate",
        "resultStatus",
        "observations",
        "provenance",
    }
    assert body["unit"] == "1"
    assert body["index"] == "NDVI"
    assert body["startDate"] == "2025-01-01"
    assert body["endDate"] == "2025-03-31"
    assert body["resultStatus"] == "available"
    assert "geometry" not in body
    assert "geometry" not in body["observations"][0]
    assert body["provenance"]["provider"].startswith("Synthetic source")


def test_excluded_observation_keeps_null_value_and_quality(client: TestClient) -> None:
    observations = _series(client, "synthetic-parcel-001").json()["observations"]

    excluded = observations[-1]
    assert excluded["observationDate"] == "2025-03-15"
    assert excluded["value"] is None
    assert excluded["quality"]["status"] == "excluded"
    assert excluded["quality"]["reasons"]


def test_observations_are_chronological(client: TestClient) -> None:
    observations = _series(client, "synthetic-parcel-001").json()["observations"]

    dates = [observation["observationDate"] for observation in observations]
    assert dates == sorted(dates)


def test_date_range_filters_candidate_acquisitions(client: TestClient) -> None:
    response = _series(
        client,
        "synthetic-parcel-001",
        {"startDate": "2025-02-01", "endDate": "2025-02-28", "index": "NDVI"},
    )

    assert response.status_code == 200
    body = response.json()
    assert [item["observationDate"] for item in body["observations"]] == ["2025-02-15"]
    assert body["resultStatus"] == "available"


def test_parcel_without_acquisitions_returns_no_observations(client: TestClient) -> None:
    response = _series(client, "synthetic-parcel-002")

    assert response.status_code == 200
    body = response.json()
    assert body["resultStatus"] == "noObservations"
    assert body["observations"] == []


def test_parcel_without_accepted_observations_returns_no_valid_observations(
    client: TestClient,
) -> None:
    response = _series(client, "synthetic-parcel-003")

    assert response.status_code == 200
    body = response.json()
    assert body["resultStatus"] == "noValidObservations"
    assert body["observations"]
    assert all(item["value"] is None for item in body["observations"])
    assert {item["quality"]["status"] for item in body["observations"]} == {
        "excluded",
        "unknown",
    }


def test_empty_range_is_a_valid_empty_response(client: TestClient) -> None:
    response = _series(
        client,
        "synthetic-parcel-001",
        {"startDate": "2024-01-01", "endDate": "2024-12-31", "index": "NDVI"},
    )

    assert response.status_code == 200
    assert response.json()["resultStatus"] == "noObservations"
    assert response.json()["observations"] == []
