from __future__ import annotations

from datetime import date
from typing import Any

from conftest import DEFAULT_QUERY, VEGETATION_SERIES_PATH
from fastapi.testclient import TestClient

from dancing_with_sars.application.science_contract import (
    ScienceProcessingError,
    ScienceRequest,
    ScienceSourceUnavailableError,
)
from dancing_with_sars.domain.vegetation import (
    DataProvenance,
    DataQuality,
    QualityStatus,
    ResultStatus,
    VegetationObservation,
    VegetationSeriesResult,
)
from dancing_with_sars.main import create_app


class _FailingGateway:
    def __init__(self, error: Exception) -> None:
        self._error = error

    def fetch_ndvi_series(self, request: ScienceRequest) -> VegetationSeriesResult:
        raise self._error


class _MalformedGateway:
    def fetch_ndvi_series(self, request: ScienceRequest) -> VegetationSeriesResult:
        return VegetationSeriesResult(
            observations=(
                VegetationObservation(
                    observation_id="synthetic-observation-malformed",
                    acquisition_id="synthetic-acquisition-malformed",
                    acquired_at=None,
                    observation_date=date(2025, 1, 15),
                    value=None,
                    quality=DataQuality(status=QualityStatus.ACCEPTED, flags=[]),
                ),
            ),
            provenance=DataProvenance(
                provider="Synthetic source (malformed test gateway)",
                dataset_name="Synthetic dataset",
                external_dataset_id=None,
                external_product_ids=None,
                external_acquisition_ids=None,
                product_version=None,
                processing_software="synthetic-processor/0.0",
                processing_method="Malformed test result",
            ),
            result_status=ResultStatus.AVAILABLE,
        )


def _get(
    client: TestClient,
    parcel_id: str = "synthetic-parcel-001",
    query: dict[str, str] | None = None,
) -> Any:
    return client.get(
        VEGETATION_SERIES_PATH.format(parcel_id=parcel_id),
        params=DEFAULT_QUERY if query is None else query,
    )


def _service_app(**overrides: Any) -> TestClient:
    return TestClient(create_app(**overrides), raise_server_exceptions=False)


def test_unknown_parcel_returns_parcel_not_found(client: TestClient) -> None:
    response = _get(client, "unknown-parcel")

    assert response.status_code == 404
    assert response.json()["code"] == "PARCEL_NOT_FOUND"
    assert response.json()["message"]
    assert response.json()["details"][0]["fieldPath"] == "parcelId"


def test_reversed_date_range_returns_invalid_date_range(client: TestClient) -> None:
    response = _get(
        client,
        query={"startDate": "2025-03-31", "endDate": "2025-01-01", "index": "NDVI"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "INVALID_DATE_RANGE"
    assert body["details"] == [
        {
            "fieldPath": "endDate",
            "code": "DATE_ORDER",
            "message": "End date precedes start date.",
        }
    ]


def test_malformed_date_returns_invalid_request(client: TestClient) -> None:
    response = _get(
        client,
        query={"startDate": "not-a-date", "endDate": "2025-03-31", "index": "NDVI"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "INVALID_REQUEST"
    assert body["details"][0]["fieldPath"] == "startDate"


def test_missing_required_parameter_returns_invalid_request(client: TestClient) -> None:
    response = _get(client, query={"endDate": "2025-03-31", "index": "NDVI"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "INVALID_REQUEST"
    details = {detail["fieldPath"]: detail for detail in body["details"]}
    assert details["startDate"]["code"] == "MISSING"


def test_unsupported_index_returns_unsupported_index(client: TestClient) -> None:
    response = _get(client, query={**DEFAULT_QUERY, "index": "EVI"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "UNSUPPORTED_INDEX"
    assert body["details"][0]["fieldPath"] == "index"


def test_source_unavailable_maps_to_503() -> None:
    app = _service_app(
        science_gateway=_FailingGateway(ScienceSourceUnavailableError("source offline")),
    )

    response = _get(app)

    assert response.status_code == 503
    assert response.json()["code"] == "SOURCE_UNAVAILABLE"
    assert response.json()["details"] == []


def test_science_processing_failure_maps_to_500() -> None:
    app = _service_app(science_gateway=_FailingGateway(ScienceProcessingError("failed")))

    response = _get(app)

    assert response.status_code == 500
    assert response.json()["code"] == "PROCESSING_FAILED"


def test_malformed_scientific_result_is_rejected() -> None:
    app = _service_app(science_gateway=_MalformedGateway())

    response = _get(app)

    assert response.status_code == 500
    assert response.json()["code"] == "PROCESSING_FAILED"


def test_unexpected_error_returns_internal_error_envelope() -> None:
    class _CrashingGateway:
        def fetch_ndvi_series(self, request: ScienceRequest) -> VegetationSeriesResult:
            raise RuntimeError("unexpected")

    app = _service_app(science_gateway=_CrashingGateway())

    response = _get(app)

    assert response.status_code == 500
    assert response.json() == {
        "code": "INTERNAL_ERROR",
        "message": "An unexpected internal error occurred.",
        "details": [],
    }


def test_unknown_route_uses_the_same_error_envelope(client: TestClient) -> None:
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"
    assert response.json()["details"] == []
