"""Validation of scientific results before API serialization.

The application layer carries science output into the public contract, so it
checks the invariants stated in ``docs/DATA_CONTRACTS.md`` instead of trusting
the provider blindly. A violation is a processing failure, never a value to
repair or drop silently.
"""

from __future__ import annotations

import math
from datetime import date

from dancing_with_sars.application.errors import ErrorDetail, ProcessingFailedError
from dancing_with_sars.domain.vegetation import (
    DataQuality,
    QualityStatus,
    ResultStatus,
    VegetationObservation,
    VegetationSeriesResult,
)


def normalize_result(
    result: VegetationSeriesResult,
    *,
    start_date: date,
    end_date: date,
) -> VegetationSeriesResult:
    """Validate contract invariants and order observations chronologically."""

    observations = tuple(sorted(result.observations, key=_ordering_key))
    _check_observation_ids(observations)
    for observation in observations:
        _check_observation(observation, start_date=start_date, end_date=end_date)

    expected_status = _status_for(observations)
    if result.result_status is not expected_status:
        raise ProcessingFailedError(
            "The scientific result status does not match its observations.",
            details=(
                ErrorDetail(
                    message=(
                        f"Reported {result.result_status.value!r} but observations "
                        f"require {expected_status.value!r}."
                    ),
                    field_path="resultStatus",
                    code="STATUS_MISMATCH",
                ),
            ),
        )

    if not result.provenance.provider.strip() or not result.provenance.dataset_name.strip():
        raise ProcessingFailedError("The scientific result is missing source provenance.")

    return VegetationSeriesResult(
        observations=observations,
        provenance=result.provenance,
        result_status=expected_status,
    )


def _ordering_key(observation: VegetationObservation) -> tuple[date, str]:
    return (observation.observation_date, observation.observation_id)


def _check_observation_ids(observations: tuple[VegetationObservation, ...]) -> None:
    seen: set[str] = set()
    for observation in observations:
        if not observation.observation_id:
            raise ProcessingFailedError("A scientific observation is missing its identifier.")
        if observation.observation_id in seen:
            raise ProcessingFailedError(
                "The scientific result contains duplicate observation identifiers."
            )
        seen.add(observation.observation_id)


def _check_observation(
    observation: VegetationObservation,
    *,
    start_date: date,
    end_date: date,
) -> None:
    if not start_date <= observation.observation_date <= end_date:
        raise ProcessingFailedError(
            "The scientific result contains an observation outside the requested range.",
            details=(
                ErrorDetail(
                    message="Observation date falls outside the requested date range.",
                    field_path="observations",
                    code="OUT_OF_RANGE",
                ),
            ),
        )
    _check_quality(observation.quality)
    if observation.quality.status is QualityStatus.ACCEPTED:
        if observation.value is None or not math.isfinite(observation.value):
            raise ProcessingFailedError(
                "An accepted observation must carry a finite numeric value."
            )
    elif observation.value is not None:
        raise ProcessingFailedError(
            "An excluded or unknown observation must not carry a numeric value."
        )


def _check_quality(quality: DataQuality) -> None:
    for count in (quality.valid_pixel_count, quality.total_pixel_count):
        if count is not None and count < 0:
            raise ProcessingFailedError("Pixel counts must not be negative.")
    if (
        quality.valid_pixel_count is not None
        and quality.total_pixel_count is not None
        and quality.valid_pixel_count > quality.total_pixel_count
    ):
        raise ProcessingFailedError("Valid pixel count exceeds total pixel count.")
    if quality.status is QualityStatus.ACCEPTED and quality.reasons:
        raise ProcessingFailedError("An accepted observation must not carry exclusion reasons.")


def _status_for(observations: tuple[VegetationObservation, ...]) -> ResultStatus:
    if not observations:
        return ResultStatus.NO_OBSERVATIONS
    if any(observation.quality.status is QualityStatus.ACCEPTED for observation in observations):
        return ResultStatus.AVAILABLE
    return ResultStatus.NO_VALID_OBSERVATIONS
