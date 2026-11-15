"""FastAPI dependencies exposing application services from application state."""

from __future__ import annotations

from fastapi import Request

from dancing_with_sars.application.service import ObservationService


def get_observation_service(request: Request) -> ObservationService:
    """Return the service assembled at application startup."""
    service = getattr(request.app.state, "observation_service", None)
    if not isinstance(service, ObservationService):
        raise RuntimeError("The observation service is not configured.")
    return service


# Backwards-compatible alias
def get_vegetation_series_service(request: Request) -> ObservationService:
    return get_observation_service(request)
