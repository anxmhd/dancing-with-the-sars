import json
from pathlib import Path

import h5py
import numpy as np
import pytest

from dancing_with_sars.science.radar.nisar_gcov import process_gcov_parcel


def _gcov_fixture(path: Path) -> None:
    with h5py.File(path, "w") as product:
        frequency = product.create_group("/science/LSAR/GCOV/grids/frequencyA")
        raster = frequency.create_dataset(
            "HHHH",
            data=np.array(
                [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0], [7.0, -9999.0, 9.0]], dtype=np.float32
            ),
        )
        raster.attrs["units"] = "1"
        raster.attrs["_FillValue"] = -9999.0
        frequency.create_dataset("xCoordinates", data=np.array([105.0, 115.0, 125.0]))
        frequency.create_dataset("yCoordinates", data=np.array([125.0, 115.0, 105.0]))
        frequency.create_dataset("xCoordinateSpacing", data=10.0)
        frequency.create_dataset("yCoordinateSpacing", data=-10.0)
        frequency.create_group("projection").attrs["epsg_code"] = "32629"
        frequency.create_dataset(
            "mask", data=np.array([[1, 1, 1], [1, 2, 2], [2, 2, 2]], dtype=np.uint8)
        )
        frequency.create_dataset("numberOfLooks", data=np.ones((3, 3), dtype=np.float32) * 4)
        product.create_group("/science/LSAR/identification")


def _parcel() -> dict[str, object]:
    return {
        "type": "Polygon",
        "coordinates": [[[100, 100], [120, 100], [120, 120], [100, 120], [100, 100]]],
    }


def test_processes_only_parcel_window_and_preserves_gamma0_units(tmp_path: Path) -> None:
    product_path = tmp_path / (
        "NISAR_L2_PR_GCOV_001_001_D_001_2005_DHDH_A_20261001T000000_"
        "20261001T000100_P00001_N_F_J_001.h5"
    )
    _gcov_fixture(product_path)

    result = process_gcov_parcel(
        product_path=product_path,
        parcel_id="parcel-1",
        geometry=_parcel(),
        geometry_crs="EPSG:32629",
    )

    assert result["status"] == "available"
    assert result["measurement"]["unit"] == "1"
    assert result["measurement"]["unitStatus"] == "definedByQuantity"
    assert result["measurement"]["quantity"] == "gamma0BackscatterCoefficient"
    assert result["measurement"]["covarianceTerm"] == "HHHH"
    assert result["measurement"]["quality"]["totalPixelCount"] == 4
    assert result["measurement"]["quality"]["validPixelCount"] == 3
    assert result["measurement"]["value"] == pytest.approx(5.0)
    assert result["source"]["crs"] == "EPSG:32629"
    assert result["source"]["resolutionM"] == [10.0, 10.0]
    assert result["measurement"]["quality"]["gcovMaskValueCounts"] == {"1": 1, "2": 3}


def test_requires_product_units_and_known_real_diagonal_term(tmp_path: Path) -> None:
    path = tmp_path / "product.h5"
    _gcov_fixture(path)
    with h5py.File(path, "a") as product:
        del product["/science/LSAR/GCOV/grids/frequencyA/HHHH"].attrs["units"]
    with pytest.raises(ValueError, match="units attribute"):
        process_gcov_parcel(
            product_path=path, parcel_id="parcel-1", geometry=_parcel(), geometry_crs="EPSG:32629"
        )
    with pytest.raises(ValueError, match="diagonal"):
        process_gcov_parcel(
            product_path=path, parcel_id="parcel-1", geometry=_parcel(), covariance_term="HHHV"
        )


def test_excludes_pixels_not_marked_fully_focused(tmp_path: Path) -> None:
    path = tmp_path / "product.h5"
    _gcov_fixture(path)
    with h5py.File(path, "a") as product:
        product["/science/LSAR/GCOV/grids/frequencyA/mask"][1, 0] = 0
        exceptions = product["/science/LSAR/GCOV/grids/frequencyA"].create_dataset(
            "inputDataExceptionMask", data=np.full((3, 3), 1 << 8, dtype=np.uint16)
        )
        exceptions[1, 1] = 0

    result = process_gcov_parcel(
        product_path=path,
        parcel_id="parcel-1",
        geometry=_parcel(),
        geometry_crs="EPSG:32629",
    )

    assert result["measurement"]["quality"]["totalPixelCount"] == 4
    assert result["measurement"]["quality"]["validPixelCount"] == 1
    assert result["measurement"]["quality"]["excludedByGcovMaskCount"] == 1
    assert result["measurement"]["quality"]["excludedByChannelFocusBitCount"] == 1


def test_handles_a_single_pixel_on_a_coarse_frequency_grid(tmp_path: Path) -> None:
    path = tmp_path / "coarse.h5"
    with h5py.File(path, "w") as product:
        grid = product.create_group("/science/LSAR/GCOV/grids/frequencyB")
        layer = grid.create_dataset("HHHH", data=np.array([[2.5]], dtype=np.float32))
        layer.attrs["units"] = "1"
        layer.attrs["_FillValue"] = np.nan
        grid.create_dataset("xCoordinates", data=[115.0])
        grid.create_dataset("yCoordinates", data=[115.0])
        grid.create_dataset("xCoordinateSpacing", data=80.0)
        grid.create_dataset("yCoordinateSpacing", data=-80.0)
        grid.create_group("projection").attrs["epsg_code"] = 32629
        grid.create_dataset("mask", data=np.array([[1]], dtype=np.uint8))
        product.create_group("/science/LSAR/identification")

    result = process_gcov_parcel(
        product_path=path,
        parcel_id="parcel-1",
        geometry=_parcel(),
        geometry_crs="EPSG:32629",
        frequency="B",
    )

    assert result["status"] == "available"
    assert result["source"]["resolutionM"] == [80.0, 80.0]
    assert result["measurement"]["value"] == pytest.approx(2.5)


def test_reads_actual_product_structure_and_reports_masked_parcel_when_available() -> None:
    repository_root = Path(__file__).resolve().parents[2]
    product_path = repository_root / (
        "data/raw/nisar/NISAR_L2_PR_GCOV_035_023_D_073_2005_DHDH_M_20261106T192031_"
        "20261106T192107_P05036_N_F_J_001.h5"
    )
    if not product_path.exists():
        pytest.skip("optional actual NISAR product is not present in data/raw/nisar")
    feature_path = Path(__file__).parents[1] / "examples/el_haouz_parcel.geojson"
    feature = json.loads(feature_path.read_text(encoding="utf-8"))

    frequency_a = process_gcov_parcel(
        product_path=product_path,
        parcel_id=feature["id"],
        geometry=feature["geometry"],
    )
    frequency_b = process_gcov_parcel(
        product_path=product_path,
        parcel_id=feature["id"],
        geometry=feature["geometry"],
        frequency="B",
    )

    assert frequency_a["source"]["productIdentifier"] == product_path.stem
    assert frequency_a["source"]["acquiredAt"] == "2026-11-06T19:20:31.000000000Z"
    assert frequency_a["source"]["crs"] == "EPSG:32629"
    assert frequency_a["source"]["resolutionM"] == [20.0, 20.0]
    assert frequency_a["measurement"]["quality"]["totalPixelCount"] == 6
    assert frequency_a["measurement"]["quality"]["validPixelCount"] == 0
    assert frequency_a["measurement"]["value"] is None
    assert frequency_b["source"]["resolutionM"] == [80.0, 80.0]
    assert frequency_b["measurement"]["quality"]["totalPixelCount"] == 1
    assert frequency_b["measurement"]["quality"]["validPixelCount"] == 0
    assert frequency_b["measurement"]["value"] is None
