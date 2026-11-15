"""FastAPI application factory and startup wiring."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI

from dancing_with_sars.api.errors import register_error_handlers
from dancing_with_sars.api.routes import api_v1_router
from dancing_with_sars.application.providers import build_science_providers
from dancing_with_sars.application.service import ObservationService
from dancing_with_sars.config import Settings

API_DESCRIPTION = """
Backend API for Dancing with the SARs: parcel discovery and multisensor observations.
""".strip()


def create_app(
    settings: Settings | None = None,
    *,
    parcel_catalog: Any = None,
    science_gateway: Any = None,
) -> FastAPI:
    resolved_settings = settings or Settings.from_environment()
    default_catalog, default_gateway = build_science_providers(resolved_settings)

    app = FastAPI(
        title="Dancing with the SARs API",
        version=resolved_settings.version,
        description=API_DESCRIPTION,
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url=None,
    )
    app.state.settings = resolved_settings
    catalog = parcel_catalog or default_catalog
    gateway = science_gateway if science_gateway is not None else default_gateway
    app.state.observation_service = ObservationService(
        parcel_catalog=catalog,
        science=gateway,
    )
    # Backwards-compatible alias
    app.state.vegetation_series_service = app.state.observation_service

    register_error_handlers(app)
    app.include_router(api_v1_router)
    return app


__all__ = ["create_app"]
