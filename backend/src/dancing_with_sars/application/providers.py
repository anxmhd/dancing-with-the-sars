"""Selection of the science provider used by the application.

Only the mock provider exists today. When Developer 3 provides a real provider,
add it here behind the same protocols; no API or orchestration code changes.
"""

from __future__ import annotations

from dancing_with_sars.application.mock_parcels import SyntheticParcelCatalog
from dancing_with_sars.application.mock_science import MockScienceGateway
from dancing_with_sars.application.science_contract import (
    ParcelCatalog,
    VegetationScienceGateway,
)
from dancing_with_sars.config import Settings

SUPPORTED_SCIENCE_PROVIDERS: tuple[str, ...] = ("mock",)


def build_science_providers(
    settings: Settings,
) -> tuple[ParcelCatalog, VegetationScienceGateway]:
    """Build the parcel catalog and science gateway for the configured mode."""

    if settings.science_provider == "mock":
        return SyntheticParcelCatalog(), MockScienceGateway()
    supported = ", ".join(SUPPORTED_SCIENCE_PROVIDERS)
    raise ValueError(
        f"Unsupported science provider {settings.science_provider!r}. "
        f"Supported providers: {supported}."
    )
