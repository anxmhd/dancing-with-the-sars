from __future__ import annotations

from typing import Any

import pytest
import yaml
from conftest import OPENAPI_PATH

from dancing_with_sars.main import create_app

PARCEL_PATH = "/api/v1/parcels/{parcelId}"
OBSERVATIONS_PATH = "/api/v1/parcels/{parcelId}/observations"


@pytest.fixture(scope="module")
def openapi_document() -> dict[str, Any]:
    return yaml.safe_load(OPENAPI_PATH.read_text(encoding="utf-8"))


def test_committed_openapi_matches_application(openapi_document: dict[str, Any]) -> None:
    assert openapi_document == create_app().openapi(), (
        "docs/api/openapi.yaml is stale. Regenerate it with "
        "`uv run python -m dancing_with_sars.api.openapi_export`."
    )


def test_openapi_documents_expected_paths(openapi_document: dict[str, Any]) -> None:
    assert set(openapi_document["paths"]) == {
        "/api/v1/health",
        PARCEL_PATH,
        OBSERVATIONS_PATH,
    }
