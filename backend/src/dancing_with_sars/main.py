"""FastAPI application factory and startup wiring."""

from __future__ import annotations

from fastapi import FastAPI

from dancing_with_sars.api.errors import register_error_handlers
from dancing_with_sars.api.routes import api_v1_router
from dancing_with_sars.application.providers import build_science_providers
from dancing_with_sars.application.science_contract import (
    ParcelCatalog,
    VegetationScienceGateway,
)
from dancing_with_sars.application.service import VegetationSeriesService
from dancing_with_sars.config import Settings

API_DESCRIPTION = """
Backend API for the Dancing with the SARs first workflow: retrieving one
agricultural parcel's seasonal Sentinel-2 NDVI observations.

The API serializes results according to `docs/DATA_CONTRACTS.md` and the
committed OpenAPI document at `docs/api/openapi.yaml`. That document is proposed
for frontend and scientific review and is not frozen until both owners confirm
it can be consumed and produced.

Development currently runs against a deterministic mock scientific provider.
Its values, identifiers, and dates are synthetic test data, not satellite
observations or Haouz measurements. No endpoint here establishes scientific
validity.
""".strip()


def create_app(
    settings: Settings | None = None,
    *,
    parcel_catalog: ParcelCatalog | None = None,
    science_gateway: VegetationScienceGateway | None = None,
) -> FastAPI:
    """Build the application, wiring the configured providers and services.

    ``parcel_catalog`` and ``science_gateway`` override the configured providers
    for tests; production startup uses the provider selected by ``Settings``.
    """

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
    app.state.vegetation_series_service = VegetationSeriesService(
        parcel_catalog=parcel_catalog or default_catalog,
        science=science_gateway or default_gateway,
    )

    register_error_handlers(app)
    app.include_router(api_v1_router)
    return app


__all__ = ["create_app"]
