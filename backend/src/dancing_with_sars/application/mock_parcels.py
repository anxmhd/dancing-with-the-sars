"""Synthetic parcel catalog used until an approved parcel source exists.

The geometry and CRS below are explicit placeholders, not Haouz data. They are
never returned by the public API; they only satisfy the internal science
interface so orchestration can be wired and tested. Real parcel reference data
requires source inspection and belongs to scientific data access.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from dancing_with_sars.domain.parcels import ParcelReference

SYNTHETIC_PARCEL_IDS: tuple[str, ...] = (
    "synthetic-parcel-001",
    "synthetic-parcel-002",
    "synthetic-parcel-003",
)

SYNTHETIC_CRS = "synthetic-crs"

_PLACEHOLDER_GEOMETRY: Mapping[str, Any] = {
    "type": "Polygon",
    "coordinates": [
        [
            [0.0, 0.0],
            [0.0, 0.001],
            [0.001, 0.001],
            [0.001, 0.0],
            [0.0, 0.0],
        ]
    ],
}


class SyntheticParcelCatalog:
    """Resolves the documented synthetic parcel IDs; all others are unknown."""

    def find_parcel(self, parcel_id: str) -> ParcelReference | None:
        if parcel_id not in SYNTHETIC_PARCEL_IDS:
            return None
        return ParcelReference(
            parcel_id=parcel_id,
            geometry=_PLACEHOLDER_GEOMETRY,
            crs=SYNTHETIC_CRS,
        )
