"""Validate shared contract fixtures and response invariants."""

from __future__ import annotations

import copy
import json
import math
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import SchemaError, ValidationError

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "contracts" / "multisensor-response.schema.json"
ERROR_SCHEMA_PATH = ROOT / "contracts" / "api-error.schema.json"
FIXTURE_DIR = ROOT / "contracts" / "fixtures"
REQUIRED_FIXTURES = {
    "sentinel1-sentinel2-available.json",
    "nisar-quality-excluded.json",
    "partial-sensor-availability.json",
    "no-observations.json",
    "unavailable-source.json",
}
UTC_TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$")
NISAR_TERMS = {"HHHH": "HH", "HVHV": "HV"}


def _reject_constant(value: str) -> None:
    raise ValueError(f"Non-standard JSON numeric constant: {value}")


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"), parse_constant=_reject_constant)


def validate_cross_fields(payload: dict[str, Any]) -> None:
    """Check constraints that depend on relationships among schema fields."""
    query = payload["query"]
    start = date.fromisoformat(query["startDate"])
    end = date.fromisoformat(query["endDate"])
    if end < start:
        raise ValueError("query.endDate must not precede query.startDate")

    requested = query["requestedMissions"]
    status_entries = payload["sensorResults"]
    status_missions = [entry["mission"] for entry in status_entries]
    if len(status_missions) != len(set(status_missions)) or set(status_missions) != set(requested):
        raise ValueError("sensorResults must contain exactly one entry per requested mission")

    observations = payload["observations"]
    if any(observation["mission"] not in requested for observation in observations):
        raise ValueError("Every observation mission must be present in query.requestedMissions")

    for observation in observations:
        acquired_at = observation["acquiredAt"]
        if not UTC_TIMESTAMP.fullmatch(acquired_at):
            raise ValueError("acquiredAt must be an RFC 3339 UTC timestamp ending in Z")
        parsed_time = datetime.fromisoformat(acquired_at[:-1] + "+00:00")
        if observation["observationDate"] != parsed_time.date().isoformat():
            raise ValueError("observationDate must equal the UTC date of acquiredAt")
        if not start <= parsed_time.date() <= end:
            raise ValueError("Every observation date must fall inside the inclusive query window")

        measurement_ids: set[tuple[Any, ...]] = set()
        for measurement in observation["measurements"]:
            value = measurement["value"]
            if isinstance(value, (int, float)) and not math.isfinite(value):
                raise ValueError("Measurement values must be finite JSON numbers")
            identity = (
                observation["mission"],
                measurement["quantity"],
                measurement.get("frequencyBand"),
                measurement.get("frequency"),
                measurement.get("polarization"),
                measurement.get("covarianceTerm"),
                measurement["statistic"],
                measurement["representation"],
            )
            if identity in measurement_ids:
                raise ValueError("Duplicate measurement identity within an observation")
            measurement_ids.add(identity)

            quality = measurement["quality"]
            valid = quality["validPixelCount"]
            total = quality["totalPixelCount"]
            excluded = quality["excludedPixelCount"]
            fraction = quality["validPixelFraction"]
            if valid is not None and total is not None and valid > total:
                raise ValueError("validPixelCount must not exceed totalPixelCount")
            if excluded is not None and total is not None and excluded > total:
                raise ValueError("excludedPixelCount must not exceed totalPixelCount")
            if valid is not None and excluded is not None and total is not None:
                if valid + excluded != total:
                    raise ValueError("validPixelCount + excludedPixelCount must equal totalPixelCount")
            if valid is not None and total is not None and total > 0 and fraction is not None:
                expected = valid / total
                if not math.isclose(fraction, expected, rel_tol=0.0, abs_tol=1e-12):
                    raise ValueError("validPixelFraction must equal validPixelCount / totalPixelCount")

            status = quality["status"]
            if status == "accepted" and (value is None or valid in (None, 0)):
                raise ValueError("Accepted measurements require a numeric value and at least one valid pixel")
            if status in {"excluded", "unknown"} and value is not None:
                raise ValueError("Excluded or unknown measurements must have value=null")

            if observation["mission"] == "NISAR":
                if measurement["covarianceTerm"] not in NISAR_TERMS:
                    raise ValueError("NISAR covarianceTerm is outside the inspected product's supported layers")
                if NISAR_TERMS[measurement["covarianceTerm"]] != measurement["polarization"]:
                    raise ValueError("NISAR covariance term and polarization do not match")
                if measurement["frequency"] not in observation["sensorDetails"]["productFrequencies"]:
                    raise ValueError("NISAR measurement frequency is absent from sensorDetails")

    if [o["acquiredAt"] for o in observations] != sorted(o["acquiredAt"] for o in observations):
        raise ValueError("Observations must be ordered chronologically by acquiredAt")

    for entry in status_entries:
        mission = entry["mission"]
        mission_observations = [o for o in observations if o["mission"] == mission]
        if entry["observationCount"] != len(mission_observations):
            raise ValueError(f"{mission} observationCount must match the returned observations")
        accepted = any(
            m["quality"]["status"] == "accepted" and m["value"] is not None
            for observation in mission_observations
            for m in observation["measurements"]
        )
        if entry["status"] == "available" and (not mission_observations or not accepted):
            raise ValueError("available requires at least one accepted numeric measurement")
        if entry["status"] == "noObservations" and mission_observations:
            raise ValueError("noObservations requires no returned acquisitions")
        if entry["status"] == "noValidObservations" and (not mission_observations or accepted):
            raise ValueError("noValidObservations requires acquisitions and no accepted numeric measurement")
        if entry["status"] == "unavailable" and mission_observations:
            raise ValueError("unavailable must not contain acquisitions that could not be retrieved")


def validate_fixture_evidence(payloads: dict[str, dict[str, Any]]) -> None:
    """Ensure real-valued examples continue to match the scientific CLI artifacts."""
    results_dir = ROOT / "data" / "results"
    s2 = _load_json(results_dir / "sentinel2_el_haouz_Trees_20240110_036_20261101.json")
    s1 = _load_json(results_dir / "sentinel1_el_haouz_Trees_20240110_036_20261026.json")
    nisar = _load_json(results_dir / "nisar_gcov_el_haouz_Trees_20240110_036_20261106.json")

    combined = payloads["sentinel1-sentinel2-available.json"]
    s2_observation = next(o for o in combined["observations"] if o["mission"] == "Sentinel-2")
    if s2_observation["measurements"][0]["value"] != s2["observation"]["value"]:
        raise ValueError("Sentinel-2 fixture NDVI differs from its scientific result artifact")
    if s2_observation["source"]["catalogItemId"] != s2["source"]["stacItem"]:
        raise ValueError("Sentinel-2 fixture catalog item differs from its scientific result artifact")
    if s2_observation["source"]["sourceProductIdentifier"] != s2["source"]["productUri"]:
        raise ValueError("Sentinel-2 fixture product URI differs from its scientific result artifact")
    if s2_observation["source"]["assetSource"]["itemId"] != s2["source"]["mirrorItem"]:
        raise ValueError("Sentinel-2 fixture mirror item differs from its scientific result artifact")
    s1_observation = next(o for o in combined["observations"] if o["mission"] == "Sentinel-1")
    for measurement in s1_observation["measurements"]:
        summary = s1["measurement"]["assetDetails"][measurement["polarization"]]["summary"]
        source_key = f"{measurement['statistic']}Gamma0Power"
        if measurement["value"] != summary[source_key]:
            raise ValueError(
                f"Sentinel-1 {measurement['polarization']} {measurement['statistic']} "
                "differs from its scientific result artifact"
            )

    nisar_observation = payloads["nisar-quality-excluded.json"]["observations"][0]
    if nisar_observation["source"]["sourceProductIdentifier"] != nisar["observation"]["source"]["sourceProductIdentifier"]:
        raise ValueError("NISAR fixture product identifier differs from its scientific artifact")
    actual_measurements = {
        (m["frequency"], m["polarization"], m["covarianceTerm"]): m
        for m in nisar["observation"]["measurements"]
    }
    fixture_measurements = {
        (m["frequency"], m["polarization"], m["covarianceTerm"]): m
        for m in nisar_observation["measurements"]
    }
    if fixture_measurements.keys() != actual_measurements.keys():
        raise ValueError("NISAR fixture channels differ from its scientific result artifact")
    for identity, actual in actual_measurements.items():
        fixture = fixture_measurements[identity]
        for key in ("value", "grid"):
            if fixture[key] != actual[key]:
                raise ValueError(f"NISAR fixture {identity} {key} differs from scientific artifact")
        for key in ("validPixelCount", "totalPixelCount", "validPixelFraction", "excludedPixelCount"):
            if fixture["quality"][key] != actual["quality"][key]:
                raise ValueError(f"NISAR fixture {identity} {key} differs from scientific artifact")

def _assert_rejected(
    validator: Draft202012Validator,
    payload: dict[str, Any],
    description: str,
) -> None:
    try:
        validator.validate(payload)
        validate_cross_fields(payload)
    except (ValidationError, ValueError, KeyError, TypeError):
        return
    raise AssertionError(f"Invalid-payload self-test was accepted: {description}")


def run_invalid_payload_checks(
    validator: Draft202012Validator,
    valid_fixture: dict[str, Any],
    nisar_fixture: dict[str, Any],
) -> int:
    cases: list[tuple[dict[str, Any], str]] = []

    invalid = copy.deepcopy(valid_fixture)
    invalid["observations"][0]["measurements"][0]["value"] = None
    cases.append((invalid, "accepted measurement with null value"))

    invalid = copy.deepcopy(valid_fixture)
    invalid["observations"][0]["measurements"].append(
        copy.deepcopy(invalid["observations"][0]["measurements"][0])
    )
    cases.append((invalid, "duplicate measurement identity"))

    invalid = copy.deepcopy(valid_fixture)
    invalid["sensorResults"].append(copy.deepcopy(invalid["sensorResults"][0]))
    cases.append((invalid, "duplicate sensor result"))

    invalid = copy.deepcopy(valid_fixture)
    invalid["observations"][0]["measurements"][0]["quality"]["validPixelFraction"] = 1.5
    cases.append((invalid, "fraction outside the unit interval"))

    invalid = copy.deepcopy(nisar_fixture)
    invalid["observations"][0]["measurements"][0]["covarianceTerm"] = "HVHV"
    cases.append((invalid, "NISAR HH polarization paired with HVHV covariance term"))

    invalid = copy.deepcopy(nisar_fixture)
    invalid["observations"][0]["measurements"].append(
        copy.deepcopy(invalid["observations"][0]["measurements"][0])
    )
    cases.append((invalid, "duplicate NISAR frequency/polarization identity"))

    invalid = copy.deepcopy(nisar_fixture)
    invalid["sensorResults"][0]["status"] = "available"
    cases.append((invalid, "available sensor result with no accepted value"))

    invalid = copy.deepcopy(valid_fixture)
    invalid["observations"][0]["acquiredAt"] = "2026-11-01T11:12:11.025"
    cases.append((invalid, "acquisition timestamp without UTC designator"))

    invalid = copy.deepcopy(valid_fixture)
    invalid["query"]["endDate"] = "2026-10-01"
    cases.append((invalid, "observation outside query date window"))

    for payload, description in cases:
        _assert_rejected(validator, payload, description)
    return len(cases)


def main() -> int:
    try:
        schema = _load_json(SCHEMA_PATH)
        error_schema = _load_json(ERROR_SCHEMA_PATH)
        Draft202012Validator.check_schema(schema)
        Draft202012Validator.check_schema(error_schema)
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        error_validator = Draft202012Validator(error_schema)
        for code in ("invalidRequest", "parcelNotFound", "internalError"):
            error_validator.validate(
                {"error": {"code": code, "message": "Synthetic validation example", "requestId": None}}
            )

        fixture_paths = sorted(FIXTURE_DIR.glob("*.json"))
        present = {path.name for path in fixture_paths}
        missing = REQUIRED_FIXTURES - present
        if missing:
            raise FileNotFoundError(f"Required fixtures missing: {', '.join(sorted(missing))}")

        payloads: dict[str, dict[str, Any]] = {}
        for path in fixture_paths:
            payload = _load_json(path)
            errors = sorted(validator.iter_errors(payload), key=lambda error: list(error.path))
            if errors:
                first = errors[0]
                pointer = "/" + "/".join(str(part) for part in first.absolute_path)
                raise ValidationError(f"{path.name} {pointer}: {first.message}")
            validate_cross_fields(payload)
            payloads[path.name] = payload

        validate_fixture_evidence(payloads)

        invalid_count = run_invalid_payload_checks(
            validator,
            payloads["sentinel1-sentinel2-available.json"],
            payloads["nisar-quality-excluded.json"],
        )
    except (OSError, ValueError, SchemaError, ValidationError, AssertionError) as exc:
        print(f"Contract validation failed: {exc}", file=sys.stderr)
        return 1

    print(
        f"Contract validation passed: response and error Draft 2020-12 schemas are valid; "
        f"{len(fixture_paths)} fixtures match schema and cross-field rules; source artifact values "
        f"match; {invalid_count} invalid payload cases rejected."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
