"""Parcel vegetation time-series endpoint."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Path, Query

from dancing_with_sars.api.dependencies import get_vegetation_series_service
from dancing_with_sars.api.schemas import ErrorResponse, VegetationSeriesResponse
from dancing_with_sars.api.serialization import serialize_vegetation_series
from dancing_with_sars.application.service import VegetationSeriesService
from dancing_with_sars.domain.vegetation import VegetationIndex

router = APIRouter(prefix="/parcels", tags=["vegetation"])

_ERROR_RESPONSES = {
    404: {"model": ErrorResponse, "description": "Unknown internal parcel identifier."},
    422: {
        "model": ErrorResponse,
        "description": "Invalid request or invalid date range/unsupported index.",
    },
    500: {"model": ErrorResponse, "description": "Internal processing failure."},
    503: {"model": ErrorResponse, "description": "Scientific data source unavailable."},
}


@router.get(
    "/{parcelId}/vegetation-series",
    response_model=VegetationSeriesResponse,
    responses=_ERROR_RESPONSES,
    summary="Retrieve a parcel's seasonal NDVI observations",
    operation_id="getParcelVegetationSeries",
)
def get_parcel_vegetation_series(
    parcel_id: str = Path(
        alias="parcelId",
        min_length=1,
        max_length=200,
        description="Internal parcel identifier from the parcel feature collection.",
    ),
    start_date: date = Query(
        alias="startDate",
        description="Inclusive first requested calendar date (YYYY-MM-DD).",
    ),
    end_date: date = Query(
        alias="endDate",
        description="Inclusive last requested calendar date (YYYY-MM-DD).",
    ),
    index: str = Query(
        description="Requested derived index. The first workflow supports NDVI only.",
        json_schema_extra={"enum": ["NDVI"]},
    ),
    service: VegetationSeriesService = Depends(get_vegetation_series_service),
) -> VegetationSeriesResponse:
    """Return candidate NDVI observations for one parcel and inclusive date range.

    Missing acquisitions are absent from ``observations`` and are never replaced
    with zeros. Excluded or unassessed candidates keep ``value: null`` and their
    quality state. A valid empty result is a 200 response with the corresponding
    ``resultStatus``, not an error.
    """

    result = service.get_series(
        parcel_id=parcel_id,
        start_date=start_date,
        end_date=end_date,
        index=index,
    )
    return serialize_vegetation_series(
        result,
        parcel_id=parcel_id,
        index=VegetationIndex(index),
        start_date=start_date,
        end_date=end_date,
    )
