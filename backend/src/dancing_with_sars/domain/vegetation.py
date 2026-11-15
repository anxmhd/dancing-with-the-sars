"""Vegetation-series domain values.

These plain Python values are shared by backend orchestration and the public
scientific interface. They must stay independent of FastAPI, HTTP schemas, and
provider-specific raster structures.

Semantics follow ``docs/DATA_CONTRACTS.md``:

- An accepted observation carries a finite numeric value.
- An excluded or unknown observation carries ``None`` and its quality state.
- A missing acquisition is absent from the series; it is never represented by a
  fabricated value or zero.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Any


class VegetationIndex(Enum):
    """Derived indices supported by the first workflow."""

    NDVI = "NDVI"


class ResultStatus(Enum):
    """Scientific result states; the API maps these to camelCase values."""

    AVAILABLE = "available"
    NO_OBSERVATIONS = "no_observations"
    NO_VALID_OBSERVATIONS = "no_valid_observations"


class QualityStatus(Enum):
    """Parcel-level quality outcome for one derived observation."""

    ACCEPTED = "accepted"
    EXCLUDED = "excluded"
    UNKNOWN = "unknown"


@dataclass(frozen=True, slots=True)
class DataQuality:
    """Derived quality state for one parcel-level observation."""

    status: QualityStatus
    flags: tuple[str, ...] | None
    reasons: tuple[str, ...] = ()
    valid_pixel_count: int | None = None
    total_pixel_count: int | None = None


@dataclass(frozen=True, slots=True)
class VegetationObservation:
    """A derived parcel-level observation tied to one source acquisition."""

    observation_id: str
    acquisition_id: str
    acquired_at: datetime | None
    observation_date: date
    value: float | None
    quality: DataQuality


@dataclass(frozen=True, slots=True)
class DataProvenance:
    """Source and processing lineage carried through to the API response."""

    provider: str
    dataset_name: str
    external_dataset_id: str | None
    external_product_ids: tuple[str, ...] | None
    external_acquisition_ids: tuple[str, ...] | None
    product_version: str | None
    processing_software: str | None
    processing_method: str
    processing_parameters: Mapping[str, Any] = field(default_factory=dict)
    processed_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class VegetationSeriesResult:
    """Result returned by the scientific use case for a parcel time series."""

    observations: tuple[VegetationObservation, ...]
    provenance: DataProvenance
    result_status: ResultStatus
