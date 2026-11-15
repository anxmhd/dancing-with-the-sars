"""Parcel summaries from local NISAR GCOV HDF5 products.

GCOV diagonal terms are gamma-zero backscatter power. This reader preserves
their linear product values and excludes pixels that the product marks as
outside the acquisition or not fully focused. A successful read is not a
scientific validation of product calibration or interpretation.
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

import h5py
import numpy as np
from rasterio.features import geometry_mask
from rasterio.transform import Affine
from rasterio.warp import transform_geom
from shapely.geometry import shape

_DIAGONAL_POLARIZATIONS = {
    "HHHH": ("HH", 1 << 8),
    "HVHV": ("HV", 1 << 9),
    "VVVV": ("VV", 1 << 11),
    "VHVH": ("VH", 1 << 10),
    "RHRH": ("RH", 1 << 12),
    "RVRV": ("RV", 1 << 13),
}
_IDENTIFICATION_FIELDS = (
    "granuleId",
    "platformName",
    "instrumentName",
    "productType",
    "productLevel",
    "productVersion",
    "productSpecificationVersion",
    "processingDateTime",
    "processingType",
    "processingCenter",
    "compositeReleaseId",
    "radarBand",
    "zeroDopplerStartTime",
    "zeroDopplerEndTime",
    "orbitPassDirection",
    "lookDirection",
    "trackNumber",
    "absoluteOrbitNumber",
    "listOfFrequencies",
    "listOfObservationModes",
    "isFullFrame",
    "frameNumber",
    "hasInputDataException",
    "productDoi",
)


def _plain(value: Any) -> Any:
    if isinstance(value, bytes):
        return value.decode("utf-8").rstrip("\x00")
    if isinstance(value, np.generic):
        return _plain(value.item())
    if isinstance(value, np.ndarray):
        return [_plain(item) for item in value.tolist()]
    if isinstance(value, list):
        return [_plain(item) for item in value]
    return value


def _dataset_value(group: h5py.Group, name: str) -> Any:
    if name not in group:
        return None
    dataset = group[name]
    if not isinstance(dataset, h5py.Dataset) or dataset.size == 0:
        return None
    return _plain(dataset[()])


def _attribute_value(attributes: h5py.AttributeManager, name: str) -> Any:
    return _plain(attributes[name]) if name in attributes else None


def _counts(values: np.ndarray) -> dict[str, int]:
    unique, counts = np.unique(values, return_counts=True)
    return {str(int(value)): int(count) for value, count in zip(unique, counts, strict=True)}


def _grid_spacing(coordinates: h5py.Dataset, spacing_dataset: h5py.Dataset) -> float:
    declared = float(spacing_dataset[()])
    values = coordinates[:]
    if values.size > 1:
        actual = np.diff(values)
        if not np.allclose(actual, declared, rtol=0.0, atol=max(1e-7, abs(declared) * 1e-7)):
            raise ValueError("GCOV coordinate spacing conflicts with its declared spacing")
    if declared == 0:
        raise ValueError("GCOV coordinate spacing must be nonzero")
    return declared


def _axis_window(coordinates: np.ndarray, low: float, high: float) -> tuple[int, int]:
    indices = np.flatnonzero((coordinates >= low) & (coordinates <= high))
    if indices.size == 0:
        return 0, 0
    if indices[-1] - indices[0] + 1 != indices.size:
        raise ValueError("GCOV coordinate vector is not monotonic")
    return int(indices[0]), int(indices[-1]) + 1


def _identification(group: h5py.Group) -> dict[str, Any]:
    return {key: _dataset_value(group, key) for key in _IDENTIFICATION_FIELDS}


def process_gcov_parcel(
    *,
    product_path: Path,
    parcel_id: str,
    geometry: dict[str, Any],
    geometry_crs: str = "EPSG:4326",
    frequency: str = "A",
    covariance_term: str = "HHHH",
    all_touched: bool = False,
) -> dict[str, Any]:
    """Summarize one real-valued diagonal covariance layer within a parcel.

    The raster mask's zero and 255 values are excluded. When the product has
    ``inputDataExceptionMask``, a channel's fully-focused validity bit must
    also be set and the documented sample-slip flag must be absent.
    """
    if frequency not in ("A", "B"):
        raise ValueError("frequency must be A or B")
    if covariance_term not in _DIAGONAL_POLARIZATIONS:
        raise ValueError("covariance_term must be a real-valued diagonal GCOV layer")
    parcel = shape(geometry)
    if parcel.is_empty or not parcel.is_valid:
        raise ValueError("parcel geometry must be non-empty and valid")

    grid_path = f"/science/LSAR/GCOV/grids/frequency{frequency}"
    raster_path = f"{grid_path}/{covariance_term}"
    required = (
        raster_path,
        f"{grid_path}/xCoordinates",
        f"{grid_path}/yCoordinates",
        f"{grid_path}/xCoordinateSpacing",
        f"{grid_path}/yCoordinateSpacing",
        f"{grid_path}/projection",
        f"{grid_path}/mask",
        "/science/LSAR/identification",
    )
    with h5py.File(product_path, "r") as product:
        missing = [name for name in required if name not in product]
        if missing:
            raise ValueError(f"GCOV product is missing required dataset/group {missing[0]}")

        identification = _identification(product["/science/LSAR/identification"])
        if identification["granuleId"] and identification["granuleId"] != product_path.stem:
            raise ValueError("HDF5 granuleId does not match the product filename")

        raster = product[raster_path]
        x_dataset = product[f"{grid_path}/xCoordinates"]
        y_dataset = product[f"{grid_path}/yCoordinates"]
        x_spacing = _grid_spacing(x_dataset, product[f"{grid_path}/xCoordinateSpacing"])
        y_spacing = _grid_spacing(y_dataset, product[f"{grid_path}/yCoordinateSpacing"])
        projection = product[f"{grid_path}/projection"]
        epsg_code = _attribute_value(projection.attrs, "epsg_code")
        if epsg_code is None:
            raise ValueError("GCOV projection metadata is missing epsg_code")
        raster_crs = str(epsg_code)
        if not raster_crs.upper().startswith("EPSG:"):
            raster_crs = f"EPSG:{raster_crs}"
        unit = _attribute_value(raster.attrs, "units")
        if unit is None:
            raise ValueError("GCOV covariance layer is missing its units attribute")

        projected = transform_geom(geometry_crs, raster_crs, geometry)
        parcel_projected = shape(projected)
        minx, miny, maxx, maxy = parcel_projected.bounds
        x_coords = x_dataset[:]
        y_coords = y_dataset[:]
        col0, col1 = _axis_window(x_coords, minx, maxx)
        row0, row1 = _axis_window(y_coords, miny, maxy)
        total_pixels = 0
        valid_pixels = 0
        values = np.empty((0, 0), dtype=raster.dtype)
        inside = np.empty((0, 0), dtype=bool)
        window_transform: Affine | None = None
        mask_counts: dict[str, int] = {}
        exception_counts: dict[str, int] | None = None
        look_summary: dict[str, float] | None = None
        excluded_mask_count = 0
        excluded_channel_flag_count = 0
        excluded_sample_slip_count = 0

        if col0 != col1 and row0 != row1:
            x_window = x_coords[col0:col1]
            y_window = y_coords[row0:row1]
            if raster.shape != (len(y_coords), len(x_coords)):
                raise ValueError(
                    "GCOV coordinate vectors do not match covariance raster dimensions"
                )
            window_transform = Affine(
                x_spacing,
                0,
                float(x_window[0]) - x_spacing / 2,
                0,
                y_spacing,
                float(y_window[0]) - y_spacing / 2,
            )
            values = np.asarray(raster[row0:row1, col0:col1])
            inside = geometry_mask(
                [projected],
                out_shape=values.shape,
                transform=window_transform,
                all_touched=all_touched,
                invert=True,
            )
            total_pixels = int(inside.sum())
            mask_dataset = product[f"{grid_path}/mask"]
            mask = np.asarray(mask_dataset[row0:row1, col0:col1])
            mask_counts = _counts(mask[inside])
            mask_fill = _attribute_value(mask_dataset.attrs, "_FillValue")
            mask_valid = (mask != 0) & (mask != 255)
            if mask_fill is not None:
                mask_valid &= mask != mask_fill
            excluded_mask_count = int(np.count_nonzero(inside & ~mask_valid))

            valid = inside & mask_valid & np.isfinite(values)
            fill_value = _attribute_value(raster.attrs, "_FillValue")
            if fill_value is not None:
                try:
                    if np.isnan(float(fill_value)):
                        valid &= ~np.isnan(values)
                    else:
                        valid &= values != fill_value
                except (TypeError, ValueError):
                    valid &= values != fill_value
            valid &= values >= 0

            exception_path = f"{grid_path}/inputDataExceptionMask"
            polarization, focus_bit = _DIAGONAL_POLARIZATIONS[covariance_term]
            if exception_path in product:
                exceptions = np.asarray(product[exception_path][row0:row1, col0:col1])
                exception_counts = _counts(exceptions[inside])
                focused = (exceptions & focus_bit) != 0
                sample_slip = (exceptions & 2) != 0
                excluded_channel_flag_count = int(np.count_nonzero(inside & ~focused))
                excluded_sample_slip_count = int(np.count_nonzero(inside & sample_slip))
                valid &= focused & ~sample_slip

            valid_pixels = int(valid.sum())
            samples = values[valid].astype(np.float64)
            if samples.size:
                median = float(np.median(samples))
                mean = float(np.mean(samples))
            else:
                median = mean = None

            looks_path = f"{grid_path}/numberOfLooks"
            if looks_path in product:
                looks = np.asarray(product[looks_path][row0:row1, col0:col1], dtype=float)
                look_values = looks[inside & np.isfinite(looks) & (looks > 0)]
                if look_values.size:
                    look_summary = {
                        "minimum": float(look_values.min()),
                        "median": float(np.median(look_values)),
                        "maximum": float(look_values.max()),
                    }
        else:
            median = mean = None

        polarization = _DIAGONAL_POLARIZATIONS[covariance_term][0]
        acquisition_start = identification["zeroDopplerStartTime"]
        if acquisition_start is None:
            acquired_at = None
        else:
            acquired_at = f"{acquisition_start}Z"
        product_metadata = {
            key: value for key, value in identification.items() if value is not None
        }
        product_metadata["sourceLayer"] = raster_path
        product_metadata["covarianceDescription"] = _attribute_value(raster.attrs, "description")
        product_metadata["covarianceLongName"] = _attribute_value(raster.attrs, "long_name")
        product_metadata["sourceUnits"] = unit
        source_fill_value = _attribute_value(raster.attrs, "_FillValue")
        fill_value_is_nan = bool(
            isinstance(source_fill_value, (int, float)) and np.isnan(source_fill_value)
        )
        product_metadata["sourceFillValue"] = None if fill_value_is_nan else source_fill_value
        product_metadata["sourceFillValueIsNaN"] = fill_value_is_nan
        product_metadata["sourceDataType"] = str(raster.dtype)
        product_metadata["frequencyCenterHz"] = _dataset_value(
            product,
            f"/science/LSAR/GCOV/metadata/sourceData/swaths/frequency{frequency}/centerFrequency",
        )
        product_metadata["processedRangeBandwidthHz"] = _dataset_value(
            product,
            f"/science/LSAR/GCOV/metadata/sourceData/swaths/frequency{frequency}/processedRangeBandwidth",
        )
        product_metadata["maskDescription"] = _attribute_value(
            product[f"{grid_path}/mask"].attrs, "description"
        )
        product_metadata["inputExceptionMaskDescription"] = (
            _attribute_value(product[f"{grid_path}/inputDataExceptionMask"].attrs, "description")
            if f"{grid_path}/inputDataExceptionMask" in product
            else None
        )

    quality_flags = []
    if excluded_mask_count:
        quality_flags.append("gcovMaskNotFullyFocusedOrOutside")
    if excluded_channel_flag_count:
        quality_flags.append("channelFullyFocusedValidityBitNotSet")
    if excluded_sample_slip_count:
        quality_flags.append("inputSampleSlipFlag")
    quality_status = "accepted" if valid_pixels else "excluded"
    reasons = [] if valid_pixels else ["No parcel pixel passed the declared GCOV validity rules."]
    return {
        "status": "available" if valid_pixels else "no_valid_pixels",
        "parcelId": parcel_id,
        "measurement": {
            "quantity": "gamma0BackscatterCoefficient",
            "covarianceTerm": covariance_term,
            "polarization": polarization,
            "frequency": frequency,
            "representation": "linearPower",
            "unit": str(unit),
            "unitStatus": "definedByQuantity",
            "statistic": "median",
            "value": median,
            "meanLinearPower": mean,
            "quality": {
                "status": quality_status,
                "flags": quality_flags if quality_flags else None,
                "reasons": reasons,
                "validPixelCount": valid_pixels,
                "totalPixelCount": total_pixels,
                "validPixelFraction": valid_pixels / total_pixels if total_pixels else 0.0,
                "excludedPixelCount": total_pixels - valid_pixels,
                "excludedByGcovMaskCount": excluded_mask_count,
                "excludedByChannelFocusBitCount": excluded_channel_flag_count,
                "excludedBySampleSlipCount": excluded_sample_slip_count,
                "gcovMaskValueCounts": mask_counts,
                "inputDataExceptionMaskValueCounts": exception_counts,
            },
        },
        "source": {
            "productFileName": product_path.name,
            "productIdentifier": product_metadata.get("granuleId") or product_path.stem,
            "acquiredAt": acquired_at,
            "crs": raster_crs,
            "resolutionM": [abs(x_spacing), abs(y_spacing)],
            "transformGdal": (
                list(window_transform.to_gdal()) if window_transform is not None else None
            ),
            "numberOfLooksWithinParcel": look_summary,
            "productMetadata": product_metadata,
        },
        "processing": {
            "geometryCrs": geometry_crs,
            "pixelInclusion": "all touched" if all_touched else "pixel center",
            "qualityRule": (
                "Finite, nonnegative values not equal to the declared fill value; GCOV mask 0 "
                "(not fully focused/invalid) and 255 (outside acquisition) excluded; when "
                "present, the channel focus-validity bit must be set and sample-slip flag 2 absent."
            ),
            "validityBit": _DIAGONAL_POLARIZATIONS[covariance_term][1],
            "fillValueHandling": (
                "Dataset _FillValue metadata used; HDF5 storage fillvalue is not treated as nodata."
            ),
            "interpretationLimit": (
                "Gamma-zero backscatter depends on surface, vegetation, roughness, polarization, "
                "frequency, geometry and processing; it is not a direct soil-moisture or "
                "vegetation-stress measurement."
            ),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--product", required=True, type=Path)
    parser.add_argument("--parcel", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--frequency", choices=("A", "B", "both"), default="both")
    args = parser.parse_args()
    feature = json.loads(args.parcel.read_text(encoding="utf-8"))
    if feature.get("type") != "Feature" or not feature.get("geometry"):
        parser.error("parcel GeoJSON must be one Feature with geometry")
    properties = feature.get("properties", {})
    parcel_id = feature.get("id") or properties.get("parcel_id") or properties.get("parcelId")
    if not parcel_id:
        parser.error("parcel feature must include id or properties.parcel_id")

    frequencies = "AB" if args.frequency == "both" else args.frequency
    with h5py.File(args.product, "r") as source:
        identification = _identification(source["/science/LSAR/identification"])
        available = {
            frequency: source[
                f"/science/LSAR/GCOV/grids/frequency{frequency}/listOfCovarianceTerms"
            ].asstr()[:].tolist()
            for frequency in frequencies
        }
    measurements = []
    for frequency, terms in available.items():
        for term in terms:
            result = process_gcov_parcel(
                product_path=args.product,
                parcel_id=str(parcel_id),
                geometry=feature["geometry"],
                geometry_crs=properties.get("geometry_crs", "EPSG:4326"),
                frequency=frequency,
                covariance_term=term,
            )
            measurements.append(result)
    if not measurements:
        parser.error("the requested frequency grids contain no diagonal covariance terms")

    start = identification.get("zeroDopplerStartTime")
    product_id = identification.get("granuleId") or args.product.stem
    acquisition_date = date.fromisoformat(start[:10]).isoformat() if start else None
    first_product_metadata = measurements[0]["source"]["productMetadata"]
    layer_metadata_keys = {
        "sourceLayer",
        "covarianceDescription",
        "covarianceLongName",
        "sourceUnits",
        "sourceFillValue",
        "sourceFillValueIsNaN",
        "sourceDataType",
        "frequencyCenterHz",
        "processedRangeBandwidthHz",
        "maskDescription",
        "inputExceptionMaskDescription",
    }
    output = {
        "artifactType": "scientificParcelSummary",
        "artifactVersion": "1.0",
        "parcelId": str(parcel_id),
        "status": (
            "available"
            if any(r["status"] == "available" for r in measurements)
            else "noValidMeasurements"
        ),
        "observation": {
                "acquiredAt": f"{start}Z" if start else None,
                "observationDate": acquisition_date,
                "mission": "NISAR",
                "platform": identification.get("platformName"),
                "instrument": identification.get("instrumentName"),
                "sensorDetails": {
                    "radarBand": identification.get("radarBand"),
                    "orbitPassDirection": identification.get("orbitPassDirection"),
                    "lookDirection": identification.get("lookDirection"),
                    "trackNumber": identification.get("trackNumber"),
                    "absoluteOrbitNumber": identification.get("absoluteOrbitNumber"),
                    "productFrequencies": ["A", "B"],
                },
                "source": {
                    "catalogProvider": "Not recorded in the supplied local HDF5 product",
                    "dataset": "NISAR Level-2 Geocoded Polarimetric Covariance (GCOV)",
                    "collectionId": None,
                    "catalogItemId": None,
                    "catalogUrl": None,
                    "sourceProductIdentifier": product_id,
                    "productUri": None,
                    "processingVersion": identification.get("productVersion"),
                    "processingDateTime": (
                        f"{identification['processingDateTime']}Z"
                        if identification.get("processingDateTime")
                        else None
                    ),
                    "productType": identification.get("productType"),
                    "processingLevel": identification.get("productLevel"),
                    "assetSource": {
                        "provider": "User-supplied local HDF5 product; path omitted",
                        "collectionId": None,
                        "itemId": product_id,
                    },
                    "sourceProcessingNote": (
                        "The exact catalog record and download URL were not retained with the "
                        "local file; source identity is verified from its internal granuleId."
                    ),
                    "productMetadata": {
                        key: value
                        for key, value in first_product_metadata.items()
                        if key not in layer_metadata_keys
                    },
                },
                "measurements": [
                    {
                        "quantity": r["measurement"]["quantity"],
                        "polarization": r["measurement"]["polarization"],
                        "frequency": r["measurement"]["frequency"],
                        "covarianceTerm": r["measurement"]["covarianceTerm"],
                        "representation": r["measurement"]["representation"],
                        "value": r["measurement"]["value"],
                        "unit": r["measurement"]["unit"],
                        "unitStatus": r["measurement"]["unitStatus"],
                        "statistic": "median",
                        "grid": {
                            "crs": r["source"]["crs"],
                            "resolution": r["source"]["resolutionM"],
                            "resolutionUnit": "m",
                            "transformGdal": r["source"]["transformGdal"],
                        },
                        "quality": r["measurement"]["quality"],
                        "processing": {
                            **r["processing"],
                            "method": (
                                "median parcel-center value from one diagonal GCOV covariance layer"
                            ),
                            "sourceLayer": r["source"]["productMetadata"]["sourceLayer"],
                            "covarianceDescription": r["source"]["productMetadata"][
                                "covarianceDescription"
                            ],
                            "sourceUnits": r["source"]["productMetadata"]["sourceUnits"],
                            "sourceDataType": r["source"]["productMetadata"]["sourceDataType"],
                            "sourceFillValue": r["source"]["productMetadata"]["sourceFillValue"],
                            "sourceFillValueIsNaN": r["source"]["productMetadata"][
                                "sourceFillValueIsNaN"
                            ],
                            "numberOfLooksWithinCandidatePixels": r["source"][
                                "numberOfLooksWithinParcel"
                            ],
                            "centerFrequencyHz": r["source"]["productMetadata"][
                                "frequencyCenterHz"
                            ],
                            "processedRangeBandwidthHz": r["source"]["productMetadata"][
                                "processedRangeBandwidthHz"
                            ],
                            "gcovMaskDescription": r["source"]["productMetadata"][
                                "maskDescription"
                            ],
                            "inputDataExceptionMaskDescription": r["source"][
                                "productMetadata"
                            ]["inputExceptionMaskDescription"],
                        },
                    }
                    for r in measurements
                ],
                "limitations": [
                    (
                        "The source masks reject every candidate parcel pixel for this granule, "
                        "so no accepted parcel-level value is available."
                    ),
                    (
                        "The product records gamma-zero power in unit 1. It is not a direct "
                        "soil-moisture or vegetation-stress measurement."
                    ),
                    (
                        "Frequency A and B are distinct NISAR acquisition channels with "
                        "different center frequencies and output grid spacings; their values "
                        "are not interchangeable."
                    ),
                    (
                        "NISAR must not be numerically compared with Sentinel-1 C-band without "
                        "accounting for frequency, polarization, geometry, dates, resolution "
                        "and processing."
                    ),
                    (
                        "The exact catalog record and download URL were not preserved by the "
                        "local download workflow."
                    ),
                ],
            },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "productId": product_id,
                "status": output["status"],
                "measurementCount": len(output["observation"]["measurements"]),
            }
        )
    )


if __name__ == "__main__":
    main()
