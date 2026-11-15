"""FastAPI dependencies exposing application services from application state."""

from __future__ import annotations

from fastapi import Request

from dancing_with_sars.application.service import VegetationSeriesService


def get_vegetation_series_service(request: Request) -> VegetationSeriesService:
    """Return the service assembled at application startup."""

    service = getattr(request.app.state, "vegetation_series_service", None)
    if not isinstance(service, VegetationSeriesService):
        raise RuntimeError("The vegetation series service is not configured.")
    return service
