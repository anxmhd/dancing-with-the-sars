"""Deterministic, explicitly synthetic scientific provider.

This provider exists so the backend can be integrated and tested before real
Sentinel-2 products are available. It performs no satellite access, raster
processing, NDVI calculation, cloud masking, or parcel aggregation.

Every identifier, date, and value it returns is synthetic test data. The
provenance it reports says so explicitly. It is replaceable by the real
scientific implementation without changing backend orchestration.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from dancing_with_sars.application.science_contract import (
    ScienceProcessingError,
    ScienceRequest,
)
from dancing_with_sars.domain.vegetation import (
    DataProvenance,
    DataQuality,
    QualityStatus,
    ResultStatus,
    VegetationIndex,
    VegetationObservation,
    VegetationSeriesResult,
)

SYNTHETIC_PROVIDER = "Synthetic source (mock science provider)"
SYNTHETIC_DATASET = "Synthetic dataset (not satellite data)"
SYNTHETIC_PROCESSOR = "synthetic-processor/0.1.0"
SYNTHETIC_METHOD = "Synthetic NDVI aggregation (mock; not a scientific method)"


@dataclass(frozen=True, slots=True)
class _Candidate:
    """One fabricated candidate acquisition for the mock provider."""

    observation_id: str
    acquisition_id: str
    observation_date: date
    value: float | None
    quality_status: QualityStatus
    reason: str | None = None


_ACCEPTED_AND_EXCLUDED: tuple[_Candidate, ...] = (
    _Candidate(
        observation_id="synthetic-vegetation-observation-001",
        acquisition_id="synthetic-acquisition-001",
        observation_date=date(2025, 1, 15),
        value=0.42,
        quality_status=QualityStatus.ACCEPTED,
    ),
    _Candidate(
        observation_id="synthetic-vegetation-observation-002",
        acquisition_id="synthetic-acquisition-002",
        observation_date=date(2025, 2, 15),
        value=0.51,
        quality_status=QualityStatus.ACCEPTED,
    ),
    _Candidate(
        observation_id="synthetic-vegetation-observation-003",
        acquisition_id="synthetic-acquisition-003",
        observation_date=date(2025, 3, 15),
        value=None,
        quality_status=QualityStatus.EXCLUDED,
        reason="Synthetic exclusion for mock and demonstration purposes",
    ),
    _Candidate(
        observation_id="synthetic-vegetation-observation-004",
        acquisition_id="synthetic-acquisition-004",
        observation_date=date(2025, 4, 15),
        value=0.38,
        quality_status=QualityStatus.ACCEPTED,
    ),
)

_ALL_EXCLUDED: tuple[_Candidate, ...] = (
    _Candidate(
        observation_id="synthetic-vegetation-observation-101",
        acquisition_id="synthetic-acquisition-101",
        observation_date=date(2025, 1, 15),
        value=None,
        quality_status=QualityStatus.EXCLUDED,
        reason="Synthetic exclusion for mock and demonstration purposes",
    ),
    _Candidate(
        observation_id="synthetic-vegetation-observation-102",
        acquisition_id="synthetic-acquisition-102",
        observation_date=date(2025, 2, 15),
        value=None,
        quality_status=QualityStatus.UNKNOWN,
        reason="Synthetic missing quality metadata for mock purposes",
    ),
)

_SCENARIOS: dict[str, tuple[_Candidate, ...]] = {
    "synthetic-parcel-001": _ACCEPTED_AND_EXCLUDED,
    "synthetic-parcel-002": (),
    "synthetic-parcel-003": _ALL_EXCLUDED,
}


class MockScienceGateway:
    """Serves contract-shaped synthetic results without scientific processing."""

    def fetch_ndvi_series(self, request: ScienceRequest) -> VegetationSeriesResult:
        if request.index is not VegetationIndex.NDVI:
            raise ScienceProcessingError("The mock provider only serves NDVI.")

        candidates = _SCENARIOS.get(request.parcel_id, ())
        observations = tuple(
            _to_observation(candidate)
            for candidate in candidates
            if request.start_date <= candidate.observation_date <= request.end_date
        )
        return VegetationSeriesResult(
            observations=observations,
            provenance=DataProvenance(
                provider=SYNTHETIC_PROVIDER,
                dataset_name=SYNTHETIC_DATASET,
                external_dataset_id=None,
                external_product_ids=None,
                external_acquisition_ids=None,
                product_version=None,
                processing_software=SYNTHETIC_PROCESSOR,
                processing_method=SYNTHETIC_METHOD,
                processing_parameters={},
                processed_at=None,
            ),
            result_status=_status_for(observations),
        )


def _to_observation(candidate: _Candidate) -> VegetationObservation:
    accepted = candidate.quality_status is QualityStatus.ACCEPTED
    return VegetationObservation(
        observation_id=candidate.observation_id,
        acquisition_id=candidate.acquisition_id,
        acquired_at=None,
        observation_date=candidate.observation_date,
        value=candidate.value if accepted else None,
        quality=DataQuality(
            status=candidate.quality_status,
            flags=[] if accepted else ("synthetic_flag",),
            reasons=() if candidate.reason is None else (candidate.reason,),
            valid_pixel_count=None,
            total_pixel_count=None,
        ),
    )


def _status_for(observations: tuple[VegetationObservation, ...]) -> ResultStatus:
    if not observations:
        return ResultStatus.NO_OBSERVATIONS
    if any(observation.quality.status is QualityStatus.ACCEPTED for observation in observations):
        return ResultStatus.AVAILABLE
    return ResultStatus.NO_VALID_OBSERVATIONS
