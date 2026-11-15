"""Parcel summaries for calibrated Sentinel-1 RTC gamma-zero power."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from affine import Affine
from numpy.typing import NDArray
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from shapely.geometry import shape


@dataclass(frozen=True)
class Gamma0Band:
    """A parcel-windowed gamma-zero raster with its interpretation metadata."""

    values: NDArray[np.generic]
    transform: Affine
    crs: str
    nodata: float | int | None
    unit: str


def summarize_gamma0_parcel(
    *,
    band: Gamma0Band,
    geometry: dict[str, Any],
    geometry_crs: str,
    all_touched: bool = False,
) -> dict[str, Any]:
    """Summarize finite nonnegative, non-nodata gamma-zero power in a parcel."""
    masked = np.ma.asarray(band.values)
    raw = np.asarray(masked.data, dtype=np.float64)
    if raw.ndim != 2:
        raise ValueError("gamma-zero raster must be two-dimensional")
    parcel = shape(geometry)
    if parcel.is_empty or not parcel.is_valid:
        raise ValueError("parcel geometry must be non-empty and valid")
    parcel_projected = transform_geom(geometry_crs, band.crs, geometry)
    inside = geometry_mask(
        [parcel_projected],
        out_shape=raw.shape,
        transform=band.transform,
        all_touched=all_touched,
        invert=True,
    )
    valid = ~np.ma.getmaskarray(masked) & np.isfinite(raw) & (raw >= 0)
    if band.nodata is not None:
        valid &= raw != band.nodata
    samples = raw[inside & valid]
    pixel_size = [abs(float(band.transform.a)), abs(float(band.transform.e))]
    total_pixels = int(inside.sum())
    return {
        "crs": band.crs,
        "resolutionM": pixel_size,
        "transform": [float(value) for value in band.transform.to_gdal()],
        "nodata": band.nodata,
        "unit": band.unit,
        "totalParcelPixels": total_pixels,
        "validPixelCount": int(samples.size),
        "validPixelFraction": float(samples.size / total_pixels) if total_pixels else 0.0,
        "medianGamma0Power": float(np.median(samples)) if samples.size else None,
        "meanGamma0Power": float(np.mean(samples)) if samples.size else None,
    }
