"""Public application-to-science interface.

The backend application depends on these protocols and value types instead of
importing scientific implementation details. Developer 3 owns the scientific
engine behind them; the mock providers in this package implement the same shape
during development and testing.

Names follow the internal Python boundary in ``docs/DATA_CONTRACTS.md``.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol

from dancing_with_sars.domain.parcels import ParcelReference
from dancing_with_sars.domain.vegetation import (
    VegetationIndex,
    VegetationSeriesResult,
)


@dataclass(frozen=True, slots=True)
class ScienceRequest:
    """Inputs passed to the scientific use case for one parcel time series."""

    parcel_id: str
    parcel_geometry: Mapping[str, Any]
    parcel_crs: str
    start_date: date
    end_date: date
    index: VegetationIndex


class ScienceError(Exception):
    """Base class for failures raised by the scientific layer."""


class ScienceSourceUnavailableError(ScienceError):
    """An approved external source or product could not be reached."""


class ScienceProcessingError(ScienceError):
    """Scientific processing failed for the supplied inputs."""


class ParcelCatalog(Protocol):
    """Resolves an internal parcel ID to an approved parcel reference.

    Real geometry resolution depends on an inspected parcel source and belongs to
    scientific data access. The mock catalog supplies explicitly synthetic
    references so the application can be exercised before that source exists.
    """

    def find_parcel(self, parcel_id: str) -> ParcelReference | None:
        """Return the parcel reference, or ``None`` when the ID is unknown."""
        ...


class VegetationScienceGateway(Protocol):
    """Public scientific use case consumed by backend orchestration."""

    def fetch_ndvi_series(self, request: ScienceRequest) -> VegetationSeriesResult:
        """Return candidate observations, quality state, and provenance."""
        ...
