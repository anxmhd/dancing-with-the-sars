"""Read one Sentinel-1 RTC parcel summary from public Planetary Computer COGs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any
from urllib.parse import quote

import rasterio
from rasterio.errors import WindowError
from rasterio.features import geometry_window
from rasterio.warp import transform_geom

from dancing_with_sars.data_access._stac import get_json, signed_href
from dancing_with_sars.science.radar.sentinel1_rtc import Gamma0Band, summarize_gamma0_parcel

STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
COLLECTION = "sentinel-1-rtc"
TOKEN_URL = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-1-rtc"


def _parcel_channel(href: str, geometry: dict[str, Any], geometry_crs: str) -> dict[str, Any]:
    with rasterio.open(href) as source:
        if source.crs is None:
            raise ValueError("Sentinel-1 RTC asset has no CRS")
        projected = transform_geom(geometry_crs, source.crs, geometry)
        try:
            window = geometry_window(source, [projected])
        except WindowError as error:
            raise ValueError("Parcel does not overlap the selected Sentinel-1 RTC asset") from error
        values = source.read(1, window=window, masked=True)
        summary = summarize_gamma0_parcel(
            band=Gamma0Band(
                values=values,
                transform=source.window_transform(window),
                crs=source.crs.to_string(),
                nodata=source.nodata,
                unit="1",
            ),
            geometry=geometry,
            geometry_crs=geometry_crs,
        )
        return summary


def process_rtc_item(
    *,
    item_id: str,
    parcel_id: str,
    geometry: dict[str, Any],
    geometry_crs: str = "EPSG:4326",
) -> dict[str, Any]:
    item = get_json(f"{STAC_URL}/collections/{COLLECTION}/items/{quote(item_id, safe='')}")
    properties = item.get("properties", {})
    assets = item.get("assets", {})
    token_data = get_json(TOKEN_URL)
    token = token_data.get("token")
    if not token:
        raise ValueError("Planetary Computer did not return a temporary access token")
    channels: dict[str, Any] = {}
    for polarization in ("vv", "vh"):
        if polarization not in assets:
            raise ValueError(f"Sentinel-1 RTC item is missing {polarization.upper()} polarization")
        channels[polarization.upper()] = _parcel_channel(
            signed_href(assets[polarization]["href"], token), geometry, geometry_crs
        )
    acquired_at = properties.get("datetime")
    return {
        "status": "available"
        if any(channel["validPixelCount"] for channel in channels.values())
        else "no_valid_pixels",
        "parcelId": parcel_id,
        "source": {
            "provider": "Microsoft Planetary Computer Sentinel-1 RTC collection",
            "stacItem": item_id,
            "catalogUrl": f"{STAC_URL}/collections/{COLLECTION}/items/{quote(item_id, safe='')}",
            "platform": properties.get("platform"),
            "acquiredAt": acquired_at,
            "productIdentifier": properties.get("s1:product_identifier"),
            "processingDateTime": properties.get("s1:processing_datetime"),
            "productType": properties.get("sar:product_type"),
            "processingLevel": properties.get("s1:processing_level"),
            "instrumentMode": properties.get("sar:instrument_mode"),
            "frequencyBand": properties.get("sar:frequency_band"),
            "centerFrequencyGHz": properties.get("sar:center_frequency"),
            "polarizations": properties.get("sar:polarizations"),
            "relativeOrbit": properties.get("sat:relative_orbit"),
            "orbitState": properties.get("sat:orbit_state"),
            "observationDirection": properties.get("sar:observation_direction"),
        },
        "measurement": {
            "quantity": "terrain-corrected gamma-naught backscatter power",
            "unit": "1",
            "statistic": "median of finite, nonnegative parcel pixels in linear power",
            "assetDetails": {
                key.upper(): {
                    "productDescription": assets[key].get("description"),
                    "rasterMetadata": (assets[key].get("raster:bands") or [{}])[0],
                    "unitStatus": (
                        "STAC omits unit, scale, and offset; values are summarized as stored "
                        "gamma0 power, not dB."
                    ),
                    "summary": channels[key.upper()],
                }
                for key in ("vv", "vh")
            },
        },
        "processing": {
            "geometryCrs": geometry_crs,
            "pixelBoundaryRule": "pixel center",
            "qualityRule": (
                "Product nodata, nonfinite, and negative pixels excluded; no speckle, terrain, or "
                "additional QA filtering applied by this workflow."
            ),
            "interpretationLimit": (
                "C-band gamma-naught backscatter is affected by vegetation, moisture, roughness, "
                "geometry, polarization and processing; it is not a direct soil-moisture or stress "
                "measurement."
            ),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--item-id", required=True, help="Planetary Computer Sentinel-1 RTC item ID"
    )
    parser.add_argument(
        "--parcel", required=True, type=Path, help="GeoJSON Feature with parcel id and geometry"
    )
    parser.add_argument("--output", required=True, type=Path, help="Output JSON path")
    args = parser.parse_args()
    feature = json.loads(args.parcel.read_text(encoding="utf-8"))
    if feature.get("type") != "Feature" or not feature.get("geometry"):
        parser.error("parcel GeoJSON must be one Feature with geometry")
    properties = feature.get("properties", {})
    parcel_id = feature.get("id") or properties.get("parcel_id") or properties.get("parcelId")
    if not parcel_id:
        parser.error("parcel feature must include id or properties.parcel_id")
    result = process_rtc_item(
        item_id=args.item_id,
        parcel_id=str(parcel_id),
        geometry=feature["geometry"],
        geometry_crs=properties.get("geometry_crs", "EPSG:4326"),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "status": result["status"],
                "acquiredAt": result["source"]["acquiredAt"],
            }
        )
    )


if __name__ == "__main__":
    main()
