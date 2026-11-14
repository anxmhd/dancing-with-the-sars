"""Parcel-level NDVI calculation for one explicitly supplied acquisition.

This is a provisional scientific interface. It does not discover or download
products, choose a production quality policy, or define the HTTP response.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Literal

import numpy as np
from affine import Affine
from numpy.typing import NDArray
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.warp import reproject, transform_geom
from shapely.geometry import mapping, shape

FloatArray = NDArray[np.float64]


@dataclass(frozen=True)
class RasterBand:
    """A single 2-D raster band and the metadata needed to interpret its values."""

    values: NDArray[np.generic]
    transform: Affine
    crs: str
    nodata: float | int | None
    scale: float
    offset: float


@dataclass(frozen=True)
class ProcessingPolicy:
    """Explicit, provisional choices that affect parcel-level NDVI."""

    statistic: Literal["mean", "median"]
    excluded_scl_classes: frozenset[int]
    all_touched: bool
    minimum_valid_pixels: int
    minimum_valid_fraction: float

    def __post_init__(self) -> None:
        if self.statistic not in ("mean", "median"):
            raise ValueError("statistic must be 'mean' or 'median'")
        if self.minimum_valid_pixels < 1:
            raise ValueError("minimum_valid_pixels must be at least 1")
        if not 0 <= self.minimum_valid_fraction <= 1:
            raise ValueError("minimum_valid_fraction must be between 0 and 1")
        if any(code < 0 or code > 255 for code in self.excluded_scl_classes):
            raise ValueError("SCL class codes must be in the range 0..255")


@dataclass(frozen=True)
class NdviProvenance:
    """Source and parameters sufficient to trace one processed acquisition."""

    parcel_id: str
    acquisition_id: str
    acquisition_date: date
    source_product: str
    source_product_version: str | None
    method: str
    geometry_crs: str
    raster_crs: str
    raster_transform: tuple[float, float, float, float, float, float]
    scl_crs: str
    scl_transform: tuple[float, float, float, float, float, float]
    statistic: str
    excluded_scl_classes: tuple[int, ...]
    all_touched: bool
    minimum_valid_pixels: int
    minimum_valid_fraction: float
    red_scale: float
    red_offset: float
    nir_scale: float
    nir_offset: float


@dataclass(frozen=True)
class NdviObservation:
    """One parcel/acquisition output; rejected candidates have no numeric value."""

    value: float | None
    quality_status: Literal["accepted", "excluded"]
    reasons: tuple[str, ...]
    total_pixel_count: int
    valid_pixel_count: int
    excluded_scl_pixel_count: int
    valid_fraction: float
    provenance: NdviProvenance


@dataclass(frozen=True)
class NdviSeries:
    """Ordered processed candidates for an inclusive request period."""

    parcel_id: str
    start_date: date
    end_date: date
    observations: tuple[NdviObservation, ...]
    result_status: Literal["available", "no_observations", "no_valid_observations"]


def assemble_series(
    *,
    parcel_id: str,
    start_date: date,
    end_date: date,
    observations: tuple[NdviObservation, ...],
) -> NdviSeries:
    """Order processed acquisitions and derive the shared empty/result status.

    Acquisition discovery is intentionally outside this function. Dates with
    no source acquisition stay absent; no values are interpolated.
    """
    if end_date < start_date:
        raise ValueError("end_date must not precede start_date")
    for observation in observations:
        provenance = observation.provenance
        if provenance.parcel_id != parcel_id:
            raise ValueError("all observations must belong to parcel_id")
        if not start_date <= provenance.acquisition_date <= end_date:
            raise ValueError("observation date must be within the inclusive request period")
    ordered = tuple(
        sorted(
            observations,
            key=lambda item: (
                item.provenance.acquisition_date,
                item.provenance.acquisition_id,
            ),
        )
    )
    if not ordered:
        status: Literal["available", "no_observations", "no_valid_observations"] = "no_observations"
    elif any(item.value is not None for item in ordered):
        status = "available"
    else:
        status = "no_valid_observations"
    return NdviSeries(parcel_id, start_date, end_date, ordered, status)


def _scaled_valid_values(band: RasterBand) -> tuple[FloatArray, NDArray[np.bool_]]:
    masked = np.ma.asarray(band.values)
    raw = np.asarray(masked.data)
    if raw.ndim != 2:
        raise ValueError("raster bands must be two-dimensional")
    valid = ~np.ma.getmaskarray(masked) & np.isfinite(raw)
    if band.nodata is not None:
        valid &= raw != band.nodata
    with np.errstate(over="ignore", invalid="ignore"):
        scaled = raw.astype(np.float64) * band.scale + band.offset
    valid &= np.isfinite(scaled)
    return scaled, valid


def _align_scl(
    scl: RasterBand,
    *,
    shape: tuple[int, int],
    transform: Affine,
    crs: str,
) -> tuple[NDArray[np.uint16], NDArray[np.bool_]]:
    if np.asarray(scl.values).ndim != 2:
        raise ValueError("SCL raster must be two-dimensional")
    masked_scl = np.ma.asarray(scl.values)
    scl_values = np.asarray(masked_scl.data)
    if not np.issubdtype(scl_values.dtype, np.integer):
        raise ValueError("SCL raster values must use an integer class dtype")
    class_values = scl_values[~np.ma.getmaskarray(masked_scl)]
    if scl.nodata is not None:
        class_values = class_values[class_values != scl.nodata]
    if class_values.size and (class_values.min() < 0 or class_values.max() > 255):
        raise ValueError("SCL class values must be in the range 0..255")
    no_coverage = np.uint16(65535)
    source_scl = scl_values.astype(np.uint16)
    source_invalid = np.ma.getmaskarray(masked_scl).copy()
    if scl.nodata is not None:
        source_invalid |= scl_values == scl.nodata
    source_scl[source_invalid] = no_coverage
    aligned = np.full(shape, no_coverage, dtype=np.uint16)
    reproject(
        source=source_scl,
        destination=aligned,
        src_transform=scl.transform,
        src_crs=scl.crs,
        src_nodata=int(no_coverage),
        dst_transform=transform,
        dst_crs=crs,
        dst_nodata=int(no_coverage),
        resampling=Resampling.nearest,
    )
    return aligned, aligned != no_coverage


def process_parcel_acquisition(
    *,
    parcel_id: str,
    acquisition_id: str,
    acquisition_date: date,
    geometry: dict[str, object],
    geometry_crs: str,
    red: RasterBand,
    nir: RasterBand,
    scl: RasterBand,
    source_product: str,
    source_product_version: str | None,
    policy: ProcessingPolicy,
) -> NdviObservation:
    """Calculate an NDVI summary from co-gridded red/NIR and an SCL mask.

    Red and NIR must share shape, transform, and CRS. SCL can use another grid;
    its categorical classes are aligned with nearest-neighbor resampling.
    Geometry is transformed to the reflectance CRS and rasterized using the
    explicit ``all_touched`` boundary policy.
    """
    red_raw = np.asarray(red.values)
    nir_raw = np.asarray(nir.values)
    if red_raw.ndim != 2 or nir_raw.ndim != 2:
        raise ValueError("red and NIR bands must be two-dimensional")
    if red_raw.shape != nir_raw.shape:
        raise ValueError("red and NIR bands must have the same grid shape")
    if (red.transform, red.crs) != (nir.transform, nir.crs):
        raise ValueError("red and NIR bands must share transform and CRS")

    parcel = shape(geometry)
    if parcel.is_empty or not parcel.is_valid:
        raise ValueError("parcel geometry must be non-empty and valid")
    parcel_in_grid_crs = transform_geom(geometry_crs, red.crs, mapping(parcel))
    inside = geometry_mask(
        [parcel_in_grid_crs],
        out_shape=red_raw.shape,
        transform=red.transform,
        all_touched=policy.all_touched,
        invert=True,
    )
    total_count = int(inside.sum())

    red_values, red_valid = _scaled_valid_values(red)
    nir_values, nir_valid = _scaled_valid_values(nir)
    scl_values, scl_valid = _align_scl(
        scl,
        shape=red_raw.shape,
        transform=red.transform,
        crs=red.crs,
    )
    denominator = nir_values + red_values
    valid = inside & red_valid & nir_valid
    valid &= scl_valid
    valid &= np.isfinite(denominator) & (denominator != 0)
    scl_excluded = inside & scl_valid & np.isin(scl_values, tuple(policy.excluded_scl_classes))
    valid &= ~scl_excluded
    ndvi = np.full(red_raw.shape, np.nan, dtype=np.float64)
    np.divide(nir_values - red_values, denominator, out=ndvi, where=valid)
    valid &= np.isfinite(ndvi)
    candidates = ndvi[valid]
    valid_count = int(candidates.size)
    fraction = valid_count / total_count if total_count else 0.0

    reasons: list[str] = []
    if total_count == 0:
        reasons.append("no_parcel_pixels")
    elif valid_count == 0:
        reasons.append("no_valid_pixels")
    if valid_count < policy.minimum_valid_pixels:
        reasons.append("minimum_valid_pixels_not_met")
    if fraction < policy.minimum_valid_fraction:
        reasons.append("minimum_valid_fraction_not_met")

    value: float | None = None
    if not reasons:
        aggregate = np.mean(candidates) if policy.statistic == "mean" else np.median(candidates)
        value = float(aggregate)

    provenance = NdviProvenance(
        parcel_id=parcel_id,
        acquisition_id=acquisition_id,
        acquisition_date=acquisition_date,
        source_product=source_product,
        source_product_version=source_product_version,
        method="sentinel-2-parcel-ndvi-provisional-v1",
        geometry_crs=geometry_crs,
        raster_crs=red.crs,
        raster_transform=tuple(float(value) for value in red.transform.to_gdal()),
        scl_crs=scl.crs,
        scl_transform=tuple(float(value) for value in scl.transform.to_gdal()),
        statistic=policy.statistic,
        excluded_scl_classes=tuple(sorted(policy.excluded_scl_classes)),
        all_touched=policy.all_touched,
        minimum_valid_pixels=policy.minimum_valid_pixels,
        minimum_valid_fraction=policy.minimum_valid_fraction,
        red_scale=red.scale,
        red_offset=red.offset,
        nir_scale=nir.scale,
        nir_offset=nir.offset,
    )
    return NdviObservation(
        value=value,
        quality_status="accepted" if value is not None else "excluded",
        reasons=tuple(reasons),
        total_pixel_count=total_count,
        valid_pixel_count=valid_count,
        excluded_scl_pixel_count=int(scl_excluded.sum()),
        valid_fraction=fraction,
        provenance=provenance,
    )
