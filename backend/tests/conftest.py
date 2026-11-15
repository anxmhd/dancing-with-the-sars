from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from dancing_with_sars.main import create_app

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
OPENAPI_PATH = REPOSITORY_ROOT / "docs" / "api" / "openapi.yaml"
SHARED_FIXTURE_PATH = REPOSITORY_ROOT / "tests" / "fixtures" / "vegetation-series.synthetic.json"

PARCEL_PATH = "/api/v1/parcels/{parcel_id}"
OBSERVATIONS_PATH = "/api/v1/parcels/{parcel_id}/observations"
DEFAULT_OBSERVATIONS_QUERY = {
    "startDate": "2026-10-01",
    "endDate": "2026-11-30",
    "missions": ["Sentinel-1", "Sentinel-2"],
}


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def shared_fixture() -> dict[str, Any]:
    return json.loads(SHARED_FIXTURE_PATH.read_text(encoding="utf-8"))
