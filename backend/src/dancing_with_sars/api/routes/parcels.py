"""Parcel discovery and observation endpoints."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi import Path as PathParam

from dancing_with_sars.api.dependencies import get_observation_service
from dancing_with_sars.api.errors import error_response
from dancing_with_sars.application.errors import (
    ApplicationError,
    InvalidDateRangeError,
    ParcelNotFoundError,
)
from dancing_with_sars.application.service import ObservationService

router = APIRouter(prefix="/parcels", tags=["parcels"])

_ERROR_RESPONSES = {
    400: {"description": "Invalid request."},
    404: {"description": "Unknown parcel."},
    500: {"description": "Internal server error."},
}


@router.get(
    "/{parcelId}",
    responses=_ERROR_RESPONSES,
    summary="Retrieve one parcel as a GeoJSON Feature",
    operation_id="getParcel",
)
def get_parcel(
    parcel_id: str = PathParam(alias="parcelId", min_length=1, max_length=200),
    service: ObservationService = Depends(get_observation_service),
) -> dict[str, Any]:
    try:
        return service.get_parcel(parcel_id)
    except ParcelNotFoundError as exc:
        return error_response(status_code=404, code="parcelNotFound", message=exc.message)
    except ApplicationError as exc:
        return error_response(status_code=400, code="invalidRequest", message=exc.message)
    except Exception:  # pragma: no cover - unexpected
        return error_response(
            status_code=500,
            code="internalError",
            message="An unexpected internal error occurred.",
        )


@router.get(
    "/{parcelId}/observations",
    responses=_ERROR_RESPONSES,
    summary="Retrieve parcel observations for a date range and missions",
    operation_id="getParcelObservations",
)
def get_parcel_observations(
    parcel_id: str = PathParam(alias="parcelId", min_length=1, max_length=200),
    start_date: date = Query(alias="startDate"),
    end_date: date = Query(alias="endDate"),
    missions: list[str] | None = Query(default=None, alias="missions"),
    service: ObservationService = Depends(get_observation_service),
) -> dict[str, Any]:
    requested = missions if missions else ["Sentinel-2", "Sentinel-1", "NISAR"]
    # deduplicate preserving order
    deduped: list[str] = []
    for mission in requested:
        if mission not in deduped:
            deduped.append(mission)
    try:
        return service.get_observations(
            parcel_id=parcel_id,
            start_date=start_date,
            end_date=end_date,
            missions=deduped,
        )
    except ParcelNotFoundError as exc:
        return error_response(status_code=404, code="parcelNotFound", message=exc.message)
    except InvalidDateRangeError as exc:
        return error_response(status_code=400, code="invalidRequest", message=exc.message)
    except ApplicationError as exc:
        return error_response(status_code=400, code="invalidRequest", message=exc.message)
    except Exception:  # pragma: no cover - unexpected
        return error_response(
            status_code=500,
            code="internalError",
            message="An unexpected internal error occurred.",
        )
