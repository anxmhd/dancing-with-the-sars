"""Parcel reference values exchanged with the scientific interface."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class ParcelReference:
    """An internal parcel identifier with its source geometry and declared CRS.

    ``crs`` is the CRS declared by the inspected source; it is never inferred.
    The geometry is an internal representation and is not serialized by the API.
    """

    parcel_id: str
    geometry: Mapping[str, Any]
    crs: str
