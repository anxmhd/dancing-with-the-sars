"""Explicit mapping from domain results to the public API representation."""

from __future__ import annotations

from datetime import date

from dancing_with_sars.api.schemas import (
    ApiIndex,
    ApiQualityStatus,
    ApiResultStatus,
    DataProvenanceResponse,
    DataQualityResponse,
    VegetationObservationResponse,
    VegetationSeriesResponse,
)
from dancing_with_sars.domain.vegetation import (
    DataProvenance,
    DataQuality,
    ResultStatus,
    VegetationIndex,
    VegetationObservation,
    VegetationSeriesResult,
)

_INDEX_BY_DOMAIN: dict[VegetationIndex, ApiIndex] = {
    VegetationIndex.NDVI: ApiIndex.NDVI,
}

_STATUS_BY_DOMAIN: dict[ResultStatus, ApiResultStatus] = {
    ResultStatus.AVAILABLE: ApiResultStatus.AVAILABLE,
    ResultStatus.NO_OBSERVATIONS: ApiResultStatus.NO_OBSERVATIONS,
    ResultStatus.NO_VALID_OBSERVATIONS: ApiResultStatus.NO_VALID_OBSERVATIONS,
}


def serialize_vegetation_series(
    result: VegetationSeriesResult,
    *,
    parcel_id: str,
    index: VegetationIndex,
    start_date: date,
    end_date: date,
) -> VegetationSeriesResponse:
    """Serialize a validated scientific result into the API contract."""

    return VegetationSeriesResponse(
        parcel_id=parcel_id,
        index=_INDEX_BY_DOMAIN[index],
        unit="1",
        start_date=start_date,
        end_date=end_date,
        result_status=_STATUS_BY_DOMAIN[result.result_status],
        observations=[_serialize_observation(item) for item in result.observations],
        provenance=_serialize_provenance(result.provenance),
    )


def _serialize_observation(observation: VegetationObservation) -> VegetationObservationResponse:
    return VegetationObservationResponse(
        observation_id=observation.observation_id,
        acquisition_id=observation.acquisition_id,
        acquired_at=observation.acquired_at,
        observation_date=observation.observation_date,
        value=observation.value,
        quality=_serialize_quality(observation.quality),
    )


def _serialize_quality(quality: DataQuality) -> DataQualityResponse:
    return DataQualityResponse(
        status=ApiQualityStatus(quality.status.value),
        flags=None if quality.flags is None else list(quality.flags),
        reasons=list(quality.reasons),
        valid_pixel_count=quality.valid_pixel_count,
        total_pixel_count=quality.total_pixel_count,
    )


def _serialize_provenance(provenance: DataProvenance) -> DataProvenanceResponse:
    return DataProvenanceResponse(
        provider=provenance.provider,
        dataset_name=provenance.dataset_name,
        external_dataset_id=provenance.external_dataset_id,
        external_product_ids=(
            None
            if provenance.external_product_ids is None
            else list(provenance.external_product_ids)
        ),
        external_acquisition_ids=(
            None
            if provenance.external_acquisition_ids is None
            else list(provenance.external_acquisition_ids)
        ),
        product_version=provenance.product_version,
        processing_software=provenance.processing_software,
        processing_method=provenance.processing_method,
        processing_parameters=dict(provenance.processing_parameters),
        processed_at=provenance.processed_at,
    )
