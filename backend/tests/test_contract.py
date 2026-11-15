from __future__ import annotations

from typing import Any

import pytest
import yaml
from conftest import OPENAPI_PATH, VEGETATION_SERIES_PATH
from fastapi.testclient import TestClient

from dancing_with_sars.main import create_app

VEGETATION_PATH = "/api/v1/parcels/{parcelId}/vegetation-series"


@pytest.fixture(scope="module")
def openapi_document() -> dict[str, Any]:
    return yaml.safe_load(OPENAPI_PATH.read_text(encoding="utf-8"))


def test_committed_openapi_matches_application(openapi_document: dict[str, Any]) -> None:
    assert openapi_document == create_app().openapi(), (
        "docs/api/openapi.yaml is stale. Regenerate it with "
        "`uv run python -m dancing_with_sars.api.openapi_export`."
    )


def test_openapi_documents_only_the_first_workflow(openapi_document: dict[str, Any]) -> None:
    assert set(openapi_document["paths"]) == {
        "/api/v1/health",
        VEGETATION_PATH,
    }


def test_openapi_documents_request_parameters(openapi_document: dict[str, Any]) -> None:
    parameters = openapi_document["paths"][VEGETATION_PATH]["get"]["parameters"]
    by_location = {(item["in"], item["name"]): item for item in parameters}

    assert set(by_location) == {
        ("path", "parcelId"),
        ("query", "startDate"),
        ("query", "endDate"),
        ("query", "index"),
    }
    assert by_location[("query", "startDate")]["schema"]["format"] == "date"
    assert by_location[("query", "index")]["schema"]["enum"] == ["NDVI"]


def test_openapi_documents_error_responses(openapi_document: dict[str, Any]) -> None:
    responses = openapi_document["paths"][VEGETATION_PATH]["get"]["responses"]

    for status_code in ("404", "422", "500", "503"):
        schema = responses[status_code]["content"]["application/json"]["schema"]
        assert schema["$ref"] == "#/components/schemas/ErrorResponse"


def test_response_properties_are_camel_case(openapi_document: dict[str, Any]) -> None:
    properties = openapi_document["components"]["schemas"]["VegetationSeriesResponse"][
        "properties"
    ]

    assert set(properties) == {
        "parcelId",
        "index",
        "unit",
        "startDate",
        "endDate",
        "resultStatus",
        "observations",
        "provenance",
    }
    assert openapi_document["components"]["schemas"]["ErrorResponse"]["required"] == [
        "code",
        "message",
        "details",
    ]


def test_error_response_body_matches_documented_envelope(client: TestClient) -> None:
    response = client.get(
        VEGETATION_SERIES_PATH.format(parcel_id="unknown-parcel"),
        params={"startDate": "2025-01-01", "endDate": "2025-03-31", "index": "NDVI"},
    )

    assert response.status_code == 404
    assert set(response.json()) == {"code", "message", "details"}
