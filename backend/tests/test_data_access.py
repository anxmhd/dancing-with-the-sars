from pathlib import Path

import numpy as np
import pytest
import rasterio
from affine import Affine

from dancing_with_sars.data_access.sentinel1 import _parcel_channel
from dancing_with_sars.data_access.sentinel2 import _window_band


def test_sentinel2_band_reader_keeps_scale_crs_and_parcel_window(tmp_path: Path) -> None:
    path = tmp_path / "band.tif"
    values = np.arange(100, dtype=np.uint16).reshape(10, 10)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=10,
        height=10,
        count=1,
        dtype="uint16",
        crs="EPSG:32629",
        transform=Affine(10, 0, 600000, 0, -10, 3600000),
        nodata=0,
    ) as dataset:
        dataset.write(values, 1)

    geometry = {
        "type": "Polygon",
        "coordinates": [
            [
                [600020, 3599960],
                [600040, 3599960],
                [600040, 3599980],
                [600020, 3599980],
                [600020, 3599960],
            ]
        ],
    }
    band = _window_band(
        str(path), geometry=geometry, geometry_crs="EPSG:32629", scale=0.0001, offset=-0.1
    )

    assert band.values.shape == (2, 2)
    assert band.transform == Affine(10, 0, 600020, 0, -10, 3599980)
    assert band.crs == "EPSG:32629"
    assert band.nodata == 0
    assert band.scale == 0.0001
    assert band.offset == -0.1


def test_sentinel1_rtc_reader_reports_only_valid_gamma0_in_parcel(tmp_path: Path) -> None:
    path = tmp_path / "rtc.tif"
    values = np.array([[0.2, 0.4], [0.6, -32768]], dtype=np.float32)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=2,
        height=2,
        count=1,
        dtype="float32",
        crs="EPSG:32629",
        transform=Affine(10, 0, 600000, 0, -10, 3600000),
        nodata=-32768,
    ) as dataset:
        dataset.write(values, 1)

    geometry = {
        "type": "Polygon",
        "coordinates": [
            [
                [600000, 3599980],
                [600020, 3599980],
                [600020, 3600000],
                [600000, 3600000],
                [600000, 3599980],
            ]
        ],
    }
    result = _parcel_channel(str(path), geometry, "EPSG:32629")

    assert result["totalParcelPixels"] == 4
    assert result["validPixelCount"] == 3
    assert result["medianGamma0Power"] == pytest.approx(0.4)
    assert result["resolutionM"] == [10, 10]
