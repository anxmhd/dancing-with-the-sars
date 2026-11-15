"""Service health/status endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Request

from dancing_with_sars.api.schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Report backend service status",
    operation_id="getHealth",
)
def get_health(request: Request) -> HealthResponse:
    """Report liveness and the configured science provider.

    This endpoint does not check external data sources or scientific validity.
    """

    settings = request.app.state.settings
    return HealthResponse(
        status="ok",
        service=settings.service_name,
        version=settings.version,
        science_provider=settings.science_provider,
    )
