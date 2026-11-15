from __future__ import annotations

import pytest
from fastapi import FastAPI

from dancing_with_sars.application.mock_parcels import SyntheticParcelCatalog
from dancing_with_sars.application.mock_science import MockScienceGateway
from dancing_with_sars.application.service import VegetationSeriesService
from dancing_with_sars.config import Settings
from dancing_with_sars.main import create_app


def test_application_starts_with_configured_providers() -> None:
    app = create_app()

    assert isinstance(app, FastAPI)
    assert app.state.settings.science_provider == "mock"
    assert isinstance(app.state.vegetation_series_service, VegetationSeriesService)
    assert isinstance(
        app.state.vegetation_series_service._science,  # noqa: SLF001 - wiring assertion
        MockScienceGateway,
    )
    assert set(app.openapi()["paths"]) == {
        "/api/v1/health",
        "/api/v1/parcels/{parcelId}/vegetation-series",
    }


def test_settings_read_science_provider_from_environment() -> None:
    assert Settings.from_environment({}).science_provider == "mock"
    assert (
        Settings.from_environment({"DWS_SCIENCE_PROVIDER": "mock"}).science_provider == "mock"
    )


def test_unsupported_science_provider_fails_at_startup() -> None:
    with pytest.raises(ValueError, match="Unsupported science provider"):
        create_app(Settings(science_provider="unavailable"))


def test_injected_providers_override_defaults() -> None:
    catalog = SyntheticParcelCatalog()
    gateway = MockScienceGateway()

    app = create_app(parcel_catalog=catalog, science_gateway=gateway)

    service = app.state.vegetation_series_service
    assert isinstance(service, VegetationSeriesService)
    assert service._parcel_catalog is catalog  # noqa: SLF001 - wiring assertion
    assert service._science is gateway  # noqa: SLF001 - wiring assertion
