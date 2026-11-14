from datetime import date
from typing import Literal

import numpy as np
import pytest
from affine import Affine

from dancing_with_sars.science.vegetation.ndvi import (
    ProcessingPolicy,
    RasterBand,
    assemble_series,
    process_parcel_acquisition,
)

TRANSFORM = Affine.translation(0, 2) @ Affine.scale(1, -1)
GEOMETRY = {
    "type": "Polygon",
    "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
}


def policy(
    *,
    statistic: Literal["mean", "median"] = "mean",
    excluded_scl_classes: frozenset[int] = frozenset({3}),
    all_touched: bool = False,
    minimum_valid_pixels: int = 1,
    minimum_valid_fraction: float = 0,
) -> ProcessingPolicy:
    return ProcessingPolicy(
        statistic=statistic,
        excluded_scl_classes=excluded_scl_classes,
        all_touched=all_touched,
        minimum_valid_pixels=minimum_valid_pixels,
        minimum_valid_fraction=minimum_valid_fraction,
    )


def band(values: np.ndarray, *, nodata: float | None = None) -> RasterBand:
    return RasterBand(values, TRANSFORM, "EPSG:3857", nodata, 1, 0)


def process(
    *,
    red: np.ndarray,
    nir: np.ndarray,
    scl: np.ndarray,
    processing_policy: ProcessingPolicy | None = None,
    geometry: dict[str, object] = GEOMETRY,
    geometry_crs: str = "EPSG:3857",
    red_band: RasterBand | None = None,
    nir_band: RasterBand | None = None,
    scl_band: RasterBand | None = None,
):
    return process_parcel_acquisition(
        parcel_id="parcel-synthetic",
        acquisition_id="acquisition-synthetic",
        acquisition_date=date(2025, 1, 15),
        geometry=geometry,
        geometry_crs=geometry_crs,
        red=red_band or band(red),
        nir=nir_band or band(nir),
        scl=scl_band or band(scl),
        source_product="synthetic-product",
        source_product_version="synthetic-v1",
        policy=processing_policy or policy(),
    )


def test_calculates_pixel_ndvi_then_parcel_mean_and_provenance() -> None:
    result = process(
        red=np.array([[1, 1], [1, 1]]),
        nir=np.array([[3, 3], [3, 3]]),
        scl=np.array([[4, 4], [4, 4]]),
    )
    assert result.value == pytest.approx(0.5)
    assert result.quality_status == "accepted"
    assert result.valid_pixel_count == result.total_pixel_count == 4
    assert result.excluded_scl_pixel_count == 0
    assert result.provenance.statistic == "mean"
    assert result.provenance.raster_crs == "EPSG:3857"
    assert len(result.provenance.raster_transform) == 6


def test_applies_nodata_nonfinite_and_zero_denominator() -> None:
    result = process(
        red=np.array([[0, -1], [np.nan, 1.0]]),
        nir=np.array([[0, 1], [3, np.inf]]),
        scl=np.full((2, 2), 4),
        red_band=band(np.array([[0, -1], [np.nan, 1.0]]), nodata=-1),
    )
    assert result.value is None
    assert result.valid_pixel_count == 0
    assert result.quality_status == "excluded"


def test_honors_masked_array_pixels_and_reflectance_scale_offsets() -> None:
    red = np.ma.array([[1.0, 1.0], [1.0, 1.0]], mask=[[True, False], [False, False]])
    red_band = RasterBand(red, TRANSFORM, "EPSG:3857", None, 0.1, 0)
    nir_band = RasterBand(np.full((2, 2), 3.0), TRANSFORM, "EPSG:3857", None, 0.2, 0)
    result = process(
        red=np.ones((2, 2)),
        nir=np.full((2, 2), 3),
        scl=np.full((2, 2), 4),
        red_band=red_band,
        nir_band=nir_band,
    )
    assert result.value == pytest.approx(5 / 7)
    assert result.valid_pixel_count == 3
    assert result.provenance.red_scale == 0.1
    assert result.provenance.nir_scale == 0.2


def test_applies_explicit_scl_exclusion_and_nearest_grid_alignment() -> None:
    scl = RasterBand(
        np.array([[3]], dtype=np.uint8),
        Affine.translation(0, 2) @ Affine.scale(2, -2),
        "EPSG:3857",
        0,
        1,
        0,
    )
    result = process(
        red=np.ones((2, 2)),
        nir=np.full((2, 2), 3),
        scl=np.full((2, 2), 4),
        scl_band=scl,
    )
    assert result.value is None
    assert result.valid_pixel_count == 0
    assert result.provenance.excluded_scl_classes == (3,)


def test_scl_nodata_is_invalid_even_if_not_in_the_configured_exclusion_set() -> None:
    scl = band(np.full((2, 2), 4, dtype=np.uint8), nodata=4)
    result = process(
        red=np.ones((2, 2)),
        nir=np.full((2, 2), 3),
        scl=np.full((2, 2), 4),
        scl_band=scl,
        processing_policy=policy(excluded_scl_classes=frozenset()),
    )
    assert result.value is None
    assert result.valid_pixel_count == 0


def test_rejects_non_integer_quality_class_values() -> None:
    scl = band(np.full((2, 2), 4.0))
    with pytest.raises(ValueError, match="integer class"):
        process(
            red=np.ones((2, 2)),
            nir=np.full((2, 2), 3),
            scl=np.full((2, 2), 4),
            scl_band=scl,
        )


def test_supports_explicit_median() -> None:
    result = process(
        red=np.array([[1, 1], [1, 1]]),
        nir=np.array([[1, 3], [7, 9]]),
        scl=np.full((2, 2), 4),
        processing_policy=policy(statistic="median"),
    )
    assert result.value == pytest.approx(0.625)
    assert result.provenance.statistic == "median"


def test_excludes_when_explicit_minimum_coverage_is_not_met() -> None:
    result = process(
        red=np.ones((2, 2)),
        nir=np.full((2, 2), 3),
        scl=np.array([[4, 3], [3, 3]]),
        processing_policy=policy(minimum_valid_pixels=2, minimum_valid_fraction=0.5),
    )
    assert result.value is None
    assert result.reasons == ("minimum_valid_pixels_not_met", "minimum_valid_fraction_not_met")


def test_respects_pixel_boundary_policy() -> None:
    half_pixel_geometry = {
        "type": "Polygon",
        "coordinates": [[[0.1, 0], [0.4, 0], [0.4, 2], [0.1, 2], [0.1, 0]]],
    }
    center_only = process(
        red=np.ones((2, 2)), nir=np.full((2, 2), 3), scl=np.full((2, 2), 4),
        geometry=half_pixel_geometry,
    )
    all_touched = process(
        red=np.ones((2, 2)), nir=np.full((2, 2), 3), scl=np.full((2, 2), 4),
        geometry=half_pixel_geometry, processing_policy=policy(all_touched=True),
    )
    assert center_only.total_pixel_count == 0
    assert "no_parcel_pixels" in center_only.reasons
    assert all_touched.total_pixel_count == 2


def test_transforms_parcel_geometry_to_raster_crs() -> None:
    result = process(
        red=np.ones((2, 2)),
        nir=np.full((2, 2), 3),
        scl=np.full((2, 2), 4),
        geometry_crs="EPSG:4326",
        geometry={
            "type": "Polygon",
            "coordinates": [[[0, 0], [0.00001, 0], [0.00001, 0.00001], [0, 0.00001], [0, 0]]],
        },
    )
    assert result.total_pixel_count > 0


@pytest.mark.parametrize("invalid", [
    {"type": "Polygon", "coordinates": []},
    {"type": "Polygon", "coordinates": [[[0, 0], [2, 2], [0, 2], [2, 0], [0, 0]]]},
])
def test_rejects_empty_or_invalid_geometry(invalid: dict[str, object]) -> None:
    with pytest.raises(ValueError, match="geometry"):
        process(red=np.ones((2, 2)), nir=np.ones((2, 2)), scl=np.ones((2, 2)), geometry=invalid)


def test_rejects_reflectance_grid_mismatch() -> None:
    with pytest.raises(ValueError, match="share transform and CRS"):
        process(
            red=np.ones((2, 2)), nir=np.ones((2, 2)), scl=np.ones((2, 2)),
            nir_band=RasterBand(np.ones((2, 2)), TRANSFORM, "EPSG:4326", None, 1, 0),
        )


def test_series_preserves_gaps_sorts_and_maps_empty_states() -> None:
    first = process(red=np.ones((2, 2)), nir=np.full((2, 2), 3), scl=np.full((2, 2), 4))
    second = process(red=np.ones((2, 2)), nir=np.full((2, 2), 3), scl=np.full((2, 2), 3))
    from dataclasses import replace

    second = replace(
        second,
        provenance=replace(second.provenance, acquisition_date=date(2025, 3, 1)),
    )
    series = assemble_series(
        parcel_id="parcel-synthetic",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 3, 31),
        observations=(second, first),
    )
    assert series.result_status == "available"
    assert [o.provenance.acquisition_date for o in series.observations] == [
        date(2025, 1, 15),
        date(2025, 3, 1),
    ]
    assert assemble_series(
        parcel_id="parcel-synthetic",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 3, 31),
        observations=(),
    ).result_status == "no_observations"
    assert assemble_series(
        parcel_id="parcel-synthetic",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 3, 31),
        observations=(second,),
    ).result_status == "no_valid_observations"
