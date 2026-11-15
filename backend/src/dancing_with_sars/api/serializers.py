"""Map scientific CLI artifacts into the public multisensor response shape."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[4]
RESULTS = ROOT / "data" / "results"
PARCEL_PATH = ROOT / "backend" / "examples" / "el_haouz_parcel.geojson"
PARCELS_DIR = ROOT / "backend" / "examples" / "parcels"


def _parcel_paths() -> list[Path]:
    paths = [PARCEL_PATH] if PARCEL_PATH.is_file() else []
    if PARCELS_DIR.is_dir():
        paths.extend(sorted(PARCELS_DIR.glob("*.geojson")))
    return paths


def load_parcels() -> list[dict[str, Any]]:
    import json

    parcels: list[dict[str, Any]] = []
    for path in _parcel_paths():
        feature = json.loads(path.read_text(encoding="utf-8"))
        parcel_id = feature["properties"]["parcel_id"]
        feature["id"] = parcel_id
        parcels.append(feature)
    return sorted(parcels, key=lambda item: item["properties"]["parcel_id"])


def load_parcel() -> dict[str, Any]:
    parcels = load_parcels()
    if not parcels:
        raise FileNotFoundError("No source-backed parcel fixtures are available.")
    return parcels[0]


def _source(
    *,
    catalog_provider: str | None,
    dataset: str,
    collection_id: str | None,
    catalog_item_id: str | None,
    catalog_url: str | None,
    product_id: str | None,
    product_uri: str | None,
    processing_version: str | None,
    processing_date_time: str | None,
    product_type: str | None,
    processing_level: str | None,
    asset_source: dict[str, Any] | None = None,
    source_processing_note: str | None = None,
    product_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "catalogProvider": catalog_provider,
        "dataset": dataset,
        "collectionId": collection_id,
        "catalogItemId": catalog_item_id,
        "catalogUrl": catalog_url,
        "sourceProductIdentifier": product_id,
        "productUri": product_uri,
        "processingVersion": processing_version,
        "processingDateTime": processing_date_time,
        "productType": product_type,
        "processingLevel": processing_level,
        "assetSource": asset_source,
        "sourceProcessingNote": source_processing_note,
        "productMetadata": product_metadata,
    }


def _quality(
    *,
    status: str,
    flags: list[str] | None,
    reasons: list[str],
    valid: int | None,
    total: int | None,
    fraction: float | None,
    excluded: int | None,
    **sensor_counts: Any,
) -> dict[str, Any]:
    return {
        "status": status,
        "flags": flags,
        "reasons": reasons,
        "validPixelCount": valid,
        "totalPixelCount": total,
        "validPixelFraction": fraction,
        "excludedPixelCount": excluded,
        **sensor_counts,
    }


def serialize_sentinel2(result: dict[str, Any]) -> dict[str, Any]:
    source = result["source"]
    policy = result["qualityPolicy"]
    observation = result["observation"]
    provenance = observation["provenance"]
    measurement = {
        "quantity": "NDVI",
        "representation": "index",
        "value": observation["value"],
        "unit": "1",
        "unitStatus": "definedByQuantity",
        "statistic": policy["statistic"],
        "grid": {
            "crs": provenance["raster_crs"],
            "resolution": [10, 10],
            "resolutionUnit": "m",
            "transformGdal": provenance["raster_transform"],
        },
        "quality": _quality(
            status=observation["quality_status"],
            flags=[],
            reasons=observation["reasons"],
            valid=observation["valid_pixel_count"],
            total=observation["total_pixel_count"],
            fraction=observation["valid_fraction"],
            excluded=observation["excluded_scl_pixel_count"],
            excludedSclPixelCount=observation["excluded_scl_pixel_count"],
        ),
        "processing": {
            "method": provenance["method"],
            "bands": {
                color: {
                    "asset": source["bands"][color]["asset"],
                    "sourceAsset": source["bands"][color]["sourceAsset"],
                    "resolutionM": source["bands"][color]["nativeResolutionM"],
                    "scale": source["bands"][color]["scale"],
                    "offset": source["bands"][color]["offset"],
                    "dataType": None,
                    "nodataValue": None,
                }
                for color in ("red", "nir")
            },
            "qualityLayer": {
                "asset": "SCL",
                "sourceAsset": source["bands"]["quality"]["sourceAsset"],
                "resolutionM": source["bands"]["quality"]["nativeResolutionM"],
                "resampling": source["bands"]["quality"]["resampling"],
                "grid": {
                    "crs": provenance["scl_crs"],
                    "transformGdal": provenance["scl_transform"],
                },
                "excludedClasses": policy["excludedSclClasses"],
                "retainedClassesNote": policy["retainedSclClassesNote"],
            },
            "pixelInclusion": "pixel center",
            "minimumValidPixels": policy["minimumValidPixels"],
            "minimumValidFraction": policy["minimumValidFraction"],
        },
    }
    return {
        "acquiredAt": source["acquiredAt"],
        "observationDate": observation["provenance"]["acquisition_date"],
        "mission": "Sentinel-2",
        "platform": source["platform"],
        "instrument": "MSI",
        "sensorDetails": {
            "relativeOrbit": source["relativeOrbit"],
            "mgrsTile": source["mgrsTile"],
            "tileCloudCoverPercent": source["tileCloudCoverPercent"],
        },
        "source": _source(
            catalog_provider=source["provider"],
            dataset=observation["provenance"]["source_product"],
            collection_id="sentinel-2-l2a",
            catalog_item_id=source["stacItem"],
            catalog_url=source["catalogUrl"],
            product_id=source["productUri"],
            product_uri=source["productUri"],
            processing_version=source["processingVersion"],
            processing_date_time=None,
            product_type="MSIL2A",
            processing_level="L2A",
            asset_source={
                "provider": source["mirror"],
                "collectionId": None,
                "itemId": source["mirrorItem"],
            },
            source_processing_note=(
                "Catalog product identity and mirror item are preserved separately; "
                "the source artifact does not record a product processing timestamp."
            ),
        ),
        "measurements": [measurement],
        "limitations": [
            "NDVI is an indirect vegetation index; it does not establish crop health, "
            "vegetation or water stress, irrigation, drought impact, or groundwater conditions.",
            "The SCL exclusion, statistic, pixel inclusion, and minimum coverage settings "
            "are provisional demo choices; no independent field validation is available.",
        ],
    }


def serialize_sentinel1(result: dict[str, Any]) -> dict[str, Any]:
    source = result["source"]
    output_measurements: list[dict[str, Any]] = []
    first_summary: dict[str, Any] | None = None
    for polarization, asset in result["measurement"]["assetDetails"].items():
        summary = asset["summary"]
        first_summary = first_summary or summary
        grid = {
            "crs": summary["crs"],
            "resolution": summary["resolutionM"],
            "resolutionUnit": "m",
            "transformGdal": summary["transform"],
        }
        for statistic, key in (
            ("median", "medianGamma0Power"),
            ("mean", "meanGamma0Power"),
        ):
            output_measurements.append(
                {
                    "quantity": "gamma0BackscatterCoefficient",
                    "frequencyBand": "C",
                    "polarization": polarization,
                    "representation": "linearPower",
                    "value": summary[key],
                    "unit": "1",
                    "unitStatus": "adapterDeclaredSourceUnspecified",
                    "statistic": statistic,
                    "grid": grid,
                    "quality": _quality(
                        status="accepted",
                        flags=[],
                        reasons=[],
                        valid=summary["validPixelCount"],
                        total=summary["totalParcelPixels"],
                        fraction=summary["validPixelFraction"],
                        excluded=0,
                    ),
                    "processing": {
                        "method": result["measurement"]["quantity"],
                        "pixelInclusion": result["processing"]["pixelBoundaryRule"],
                        "excludedValues": ["product nodata", "nonfinite", "negative"],
                        "additionalParcelSummaryFiltering": False,
                        "sourceRaster": {
                            "dataType": asset["rasterMetadata"]["data_type"],
                            "nodataValue": asset["rasterMetadata"]["nodata"],
                        },
                    },
                }
            )

    assert first_summary is not None
    return {
        "acquiredAt": source["acquiredAt"],
        "observationDate": source["acquiredAt"][:10],
        "mission": "Sentinel-1",
        "platform": source["platform"],
        "instrument": "C-SAR",
        "sensorDetails": {
            "instrumentMode": source["instrumentMode"],
            "frequencyBand": source["frequencyBand"],
            "centerFrequencyGHz": source["centerFrequencyGHz"],
            "polarizations": source["polarizations"],
            "relativeOrbit": source["relativeOrbit"],
            "orbitState": source["orbitState"],
            "observationDirection": source["observationDirection"],
        },
        "source": _source(
            catalog_provider=source["provider"],
            dataset="Sentinel-1 RTC gamma0",
            collection_id="sentinel-1-rtc",
            catalog_item_id=source["stacItem"],
            catalog_url=source["catalogUrl"],
            product_id=source["productIdentifier"],
            product_uri=None,
            processing_version=None,
            processing_date_time=source["processingDateTime"],
            product_type="RTC",
            processing_level="RTC",
            source_processing_note=(
                "Source STAC omits unit, scale, and offset. Values are summarized "
                "as stored linear gamma0 power, not dB."
            ),
        ),
        "measurements": output_measurements,
        "limitations": [
            result["processing"]["interpretationLimit"],
            "The source STAC metadata omits unit, scale, and offset; the adapter "
            "reports the stored linear gamma0 values with an explicit unit caveat.",
        ],
    }


def serialize_nisar(result: dict[str, Any]) -> dict[str, Any]:
    observation = result["observation"]
    source = observation["source"]
    output_measurements: list[dict[str, Any]] = []
    for measurement in observation["measurements"]:
        quality = measurement["quality"]
        output_measurements.append(
            {
                "quantity": measurement["quantity"],
                "frequency": measurement["frequency"],
                "polarization": measurement["polarization"],
                "covarianceTerm": measurement["covarianceTerm"],
                "representation": measurement["representation"],
                "value": measurement["value"],
                "unit": measurement["unit"],
                "unitStatus": measurement["unitStatus"],
                "statistic": measurement["statistic"],
                "grid": measurement["grid"],
                "quality": _quality(
                    status=quality["status"],
                    flags=quality["flags"],
                    reasons=quality["reasons"],
                    valid=quality["validPixelCount"],
                    total=quality["totalPixelCount"],
                    fraction=quality["validPixelFraction"],
                    excluded=quality["excludedPixelCount"],
                    excludedByGcovMaskCount=quality["excludedByGcovMaskCount"],
                    excludedByChannelFocusBitCount=quality["excludedByChannelFocusBitCount"],
                    excludedBySampleSlipCount=quality["excludedBySampleSlipCount"],
                    gcovMaskValueCounts=quality["gcovMaskValueCounts"],
                    inputDataExceptionMaskValueCounts=quality[
                        "inputDataExceptionMaskValueCounts"
                    ],
                ),
                "processing": measurement["processing"],
            }
        )
    metadata = source["productMetadata"]
    return {
        "acquiredAt": observation["acquiredAt"],
        "observationDate": observation["observationDate"],
        "mission": "NISAR",
        "platform": observation["platform"],
        "instrument": observation["instrument"],
        "sensorDetails": observation["sensorDetails"],
        "source": _source(
            catalog_provider=None,
            dataset=source["dataset"],
            collection_id=source["collectionId"],
            catalog_item_id=source["catalogItemId"],
            catalog_url=source["catalogUrl"],
            product_id=source["sourceProductIdentifier"],
            product_uri=source["productUri"],
            processing_version=source["processingVersion"],
            processing_date_time=source["processingDateTime"],
            product_type=source["productType"],
            processing_level=source["processingLevel"],
            asset_source=source["assetSource"],
            source_processing_note=source["sourceProcessingNote"],
            product_metadata=metadata,
        ),
        "measurements": output_measurements,
        "limitations": observation["limitations"],
    }


# def load_parcel() -> dict[str, Any]:
#     import json
#     return json.loads(PARCEL_PATH.read_text(encoding="utf-8"))


def load_result_artifacts() -> list[tuple[str, dict[str, Any]]]:
    import json

    artifacts: list[tuple[str, dict[str, Any]]] = []
    for path in sorted(RESULTS.glob("*.json")):
        name = path.name
        if name.startswith("sentinel2_"):
            mission = "Sentinel-2"
        elif name.startswith("sentinel1_"):
            mission = "Sentinel-1"
        elif name.startswith("nisar_"):
            mission = "NISAR"
        else:
            continue
        artifacts.append((mission, json.loads(path.read_text(encoding="utf-8"))))
    return artifacts


def serialize_artifact(mission: str, result: dict[str, Any]) -> dict[str, Any]:
    serializers = {
        "Sentinel-2": serialize_sentinel2,
        "Sentinel-1": serialize_sentinel1,
        "NISAR": serialize_nisar,
    }
    return serializers[mission](result)


def artifact_parcel_id(result: dict[str, Any]) -> str | None:
    """Return the parcel a scientific artifact belongs to, across artifact shapes."""
    if result.get("parcelId"):
        return str(result["parcelId"])
    observation = result.get("observation") or {}
    return (observation.get("provenance") or {}).get("parcel_id")


def result_date(observation: dict[str, Any]) -> date:
    return date.fromisoformat(observation["observationDate"])
