"""Endpoint-handler and serialization tests against local scientific artifacts."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from jsonschema import Draft202012Validator

from dancing_with_sars.api.main import (
    Mission,
    _error,
    build_observation_response,
    parcel_feature,
    parcel_feature_collection,
)

ROOT = Path(__file__).resolve().parents[2]


def _schema(name: str) -> dict[str, Any]:
    return json.loads((ROOT / "contracts" / name).read_text(encoding="utf-8"))


def _response_body(response: Any) -> dict[str, Any]:
    return json.loads(response.body.decode("utf-8"))


def test_lists_and_retrieves_only_the_source_backed_parcel() -> None:
    collection = parcel_feature_collection()
    assert collection["type"] == "FeatureCollection"
    assert len(collection["features"]) == 4
    feature = collection["features"][0]
    parcel_id = feature["properties"]["parcel_id"]
    assert feature["id"] == parcel_id
    assert feature["geometry"]["type"] == "Polygon"
    assert parcel_feature(parcel_id)["id"] == parcel_id

    try:
        parcel_feature("not-a-known-parcel")
    except HTTPException as error:
        assert error.status_code == 404
    else:
        raise AssertionError("Unknown parcel was not rejected")


def test_real_artifacts_serialize_to_the_shared_multisensor_contract() -> None:
    payload = build_observation_response(
        "el haouz_Trees_20240110_036",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 11, 30),
        missions=[Mission.sentinel2, Mission.sentinel1, Mission.nisar],
    )
    Draft202012Validator(_schema("multisensor-response.schema.json")).validate(payload)
    assert {item["mission"]: item["status"] for item in payload["sensorResults"]} == {
        "Sentinel-2": "available",
        "Sentinel-1": "available",
        "NISAR": "noValidObservations",
    }
    assert len(payload["observations"]) == 8
    assert sum(len(item["measurements"]) for item in payload["observations"]) == 20
    nisar = next(item for item in payload["observations"] if item["mission"] == "NISAR")
    assert all(item["value"] is None for item in nisar["measurements"])


def test_unindexed_window_is_unavailable_and_date_order_is_rejected() -> None:
    payload = build_observation_response(
        "el haouz_Trees_20240110_036",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        missions=None,
    )
    Draft202012Validator(_schema("multisensor-response.schema.json")).validate(payload)
    assert payload["observations"] == []
    assert all(row["status"] == "unavailable" for row in payload["sensorResults"])

    try:
        build_observation_response(
            "el haouz_Trees_20240110_036",
            start_date=date(2026, 11, 30),
            end_date=date(2026, 10, 1),
            missions=None,
        )
    except HTTPException as error:
        assert error.status_code == 400
    else:
        raise AssertionError("Reversed date range was not rejected")


def test_errors_match_the_shared_error_schema() -> None:
    validator = Draft202012Validator(_schema("api-error.schema.json"))
    for code, status in (
        ("invalidRequest", 400),
        ("parcelNotFound", 404),
        ("internalError", 500),
    ):
        response = _error(code, "Synthetic test error", status)
        assert response.status_code == status
        validator.validate(_response_body(response))
