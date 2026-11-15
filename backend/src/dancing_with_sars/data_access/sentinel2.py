"""Read and process one Sentinel-2 L2A STAC acquisition for a GeoJSON parcel.

Discovery metadata comes from the Copernicus Data Space STAC catalog. Small
windows are read from public Planetary Computer COG mirrors using temporary
SAS tokens; source product identifiers and calibration metadata stay tied to
the Copernicus item. This module is orchestration/data access, not an API.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import rasterio
from rasterio.errors import WindowError
from rasterio.features import geometry_window
from rasterio.warp import transform_geom

from dancing_with_sars.data_access._stac import get_json, signed_href
from dancing_with_sars.science.vegetation.ndvi import (
    ProcessingPolicy,
    RasterBand,
    process_parcel_acquisition,
)

COPERNICUS_STAC = "https://stac.dataspace.copernicus.eu/v1"
PLANETARY_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
PLANETARY_TOKEN = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a"
SENTINEL2_COLLECTION = "sentinel-2-l2a"

# Exclude no-data, defective/saturated, cloud shadow, cloud probabilities,
# cirrus and snow/ice classes. SCL class 2 (dark area) and 7 (unclassified)
# are retained and explicitly reported as policy limitations.
DEFAULT_POLICY = ProcessingPolicy(
    statistic="median",
    excluded_scl_classes=frozenset({0, 1, 3, 8, 9, 10, 11}),
    all_touched=False,
    minimum_valid_pixels=5,
    minimum_valid_fraction=0.5,
)


def _item(url: str, collection: str, item_id: str) -> dict[str, Any]:
    return get_json(f"{url}/collections/{collection}/items/{quote(item_id, safe='')}")


def _scale(asset: dict[str, Any]) -> float:
    bands = asset.get("raster:bands") or []
    scale = bands[0].get("scale") if bands else asset.get("raster:scale")
    if scale is None:
        raise ValueError("Copernicus STAC asset is missing its reflectance scale")
    return float(scale)


def _window_band(
    href: str,
    *,
    geometry: dict[str, Any],
    geometry_crs: str,
    scale: float,
    offset: float,
) -> RasterBand:
    """Read only the parcel window and retain its native grid metadata."""
    with rasterio.open(href) as source:
        if source.crs is None:
            raise ValueError("Sentinel-2 band has no CRS")
        projected = transform_geom(geometry_crs, source.crs, geometry)
        try:
            window = geometry_window(source, [projected])
        except WindowError as error:
            raise ValueError("Parcel does not overlap the requested Sentinel-2 band") from error
        values = source.read(1, window=window, masked=True)
        return RasterBand(
            values=values,
            transform=source.window_transform(window),
            crs=source.crs.to_string(),
            nodata=source.nodata,
            scale=scale,
            offset=offset,
        )


def process_stac_item(
    *,
    item_id: str,
    parcel_id: str,
    geometry: dict[str, Any],
    geometry_crs: str = "EPSG:4326",
    policy: ProcessingPolicy = DEFAULT_POLICY,
) -> dict[str, Any]:
    """Process one source product, using public, window-readable mirror assets."""
    mirror = _item(PLANETARY_STAC, SENTINEL2_COLLECTION, item_id)
    product_uri = mirror.get("properties", {}).get("s2:product_uri")
    if not product_uri:
        raise ValueError("Mirror item does not provide its original Sentinel-2 product URI")
    source_id = product_uri.removesuffix(".SAFE")
    source = _item(COPERNICUS_STAC, SENTINEL2_COLLECTION, source_id)

    mirror_assets = mirror.get("assets", {})
    source_assets = source.get("assets", {})
    for required in ("B04", "B08", "SCL"):
        if required not in mirror_assets:
            raise ValueError(f"Mirror item is missing required asset {required}")
    for required in ("B04_10m", "B08_10m", "SCL_20m"):
        if required not in source_assets:
            raise ValueError(f"Copernicus item is missing required asset {required}")

    token_data = get_json(PLANETARY_TOKEN)
    token = token_data.get("token")
    if not token:
        raise ValueError("Planetary Computer did not return a temporary access token")

    red_scale = _scale(source_assets["B04_10m"])
    nir_scale = _scale(source_assets["B08_10m"])
    red = _window_band(
        signed_href(mirror_assets["B04"]["href"], token),
        geometry=geometry,
        geometry_crs=geometry_crs,
        scale=red_scale,
        offset=float(source_assets["B04_10m"].get("raster:offset", 0.0)),
    )
    nir = _window_band(
        signed_href(mirror_assets["B08"]["href"], token),
        geometry=geometry,
        geometry_crs=geometry_crs,
        scale=nir_scale,
        offset=float(source_assets["B08_10m"].get("raster:offset", 0.0)),
    )
    scl = _window_band(
        signed_href(mirror_assets["SCL"]["href"], token),
        geometry=geometry,
        geometry_crs=geometry_crs,
        scale=1.0,
        offset=0.0,
    )

    acquired_at = source.get("properties", {}).get("datetime") or mirror["properties"]["datetime"]
    acquired_date = datetime.fromisoformat(acquired_at.replace("Z", "+00:00")).date()
    source_properties = source.get("properties", {})
    result = process_parcel_acquisition(
        parcel_id=parcel_id,
        acquisition_id=source_id,
        acquisition_date=acquired_date,
        geometry=geometry,
        geometry_crs=geometry_crs,
        red=red,
        nir=nir,
        scl=scl,
        source_product="Sentinel-2 MSI Level-2A surface reflectance",
        source_product_version=str(
            source_properties.get("processing:version")
            or source_properties.get("s2:processing_baseline")
            or "unknown"
        ),
        policy=policy,
    )
    observation = asdict(result)
    observation["provenance"]["acquisition_date"] = acquired_date.isoformat()
    return {
        "source": {
            "provider": "Copernicus Data Space Ecosystem",
            "stacItem": source_id,
            "catalogUrl": (
                f"{COPERNICUS_STAC}/collections/{SENTINEL2_COLLECTION}/items/"
                f"{quote(source_id, safe='')}"
            ),
            "mirror": "Microsoft Planetary Computer public Sentinel-2 L2A COG mirror",
            "mirrorItem": mirror["id"],
            "productUri": product_uri,
            "platform": source_properties.get("platform", source_properties.get("constellation")),
            "acquiredAt": acquired_at,
            "processingVersion": source_properties.get(
                "processing:version", source_properties.get("s2:processing_baseline")
            ),
            "relativeOrbit": source_properties.get("sat:relative_orbit"),
            "mgrsTile": source_properties.get(
                "s2:mgrs_tile", mirror.get("properties", {}).get("s2:mgrs_tile")
            ),
            "tileCloudCoverPercent": source_properties.get("eo:cloud_cover"),
            "bands": {
                "red": {
                    "asset": "B04",
                    "nativeResolutionM": 10,
                    "scale": red_scale,
                    "offset": red.offset,
                    "sourceAsset": "B04_10m",
                },
                "nir": {
                    "asset": "B08",
                    "nativeResolutionM": 10,
                    "scale": nir_scale,
                    "offset": nir.offset,
                    "sourceAsset": "B08_10m",
                },
                "quality": {
                    "asset": "SCL",
                    "nativeResolutionM": 20,
                    "resampling": "nearest",
                    "sourceAsset": "SCL_20m",
                },
            },
        },
        "qualityPolicy": {
            "statistic": policy.statistic,
            "excludedSclClasses": sorted(policy.excluded_scl_classes),
            "allTouched": policy.all_touched,
            "minimumValidPixels": policy.minimum_valid_pixels,
            "minimumValidFraction": policy.minimum_valid_fraction,
            "retainedSclClassesNote": (
                "SCL 2 (dark area) and 7 (unclassified) are retained; see method limitations."
            ),
        },
        "observation": observation,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--item-id", required=True, help="Planetary Computer Sentinel-2 STAC item ID"
    )
    parser.add_argument(
        "--parcel",
        required=True,
        type=Path,
        help="GeoJSON Feature or FeatureCollection with one parcel",
    )
    parser.add_argument("--output", required=True, type=Path, help="Output JSON path")
    args = parser.parse_args()

    document = json.loads(args.parcel.read_text(encoding="utf-8"))
    if document.get("type") == "FeatureCollection":
        features = document.get("features", [])
        if len(features) != 1:
            parser.error("parcel GeoJSON FeatureCollection must contain exactly one feature")
        feature = features[0]
    elif document.get("type") == "Feature":
        feature = document
    else:
        parser.error("parcel GeoJSON must be a Feature or one-feature FeatureCollection")
    properties = feature.get("properties", {})
    parcel_id = feature.get("id") or properties.get("parcel_id") or properties.get("parcelId")
    if not parcel_id or not feature.get("geometry"):
        parser.error("parcel feature must include an id/parcel_id and geometry")
    result = process_stac_item(
        item_id=args.item_id,
        parcel_id=str(parcel_id),
        geometry=feature["geometry"],
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "value": result["observation"]["value"],
                "quality": result["observation"]["quality_status"],
            }
        )
    )


if __name__ == "__main__":
    main()
