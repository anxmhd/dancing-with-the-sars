"""Discover and process a bounded multisensor acquisition series for one parcel.

This script uses the public Planetary Computer STAC catalog for discovery and the
existing windowed COG readers for processing. It does not change the scientific
processing policy; it only repeats the approved parcel-level workflow for more
acquisitions. Raw products are never downloaded; only small parcel windows and
JSON result artifacts are written.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

from dancing_with_sars.data_access.sentinel1 import process_rtc_item, search_sentinel1_items
from dancing_with_sars.data_access.sentinel2 import process_stac_item, search_sentinel2_items


def _parcel(path: Path) -> tuple[str, dict[str, Any]]:
    document = json.loads(path.read_text(encoding="utf-8"))
    if document.get("type") == "FeatureCollection":
        features = document.get("features", [])
        if len(features) != 1:
            raise ValueError("parcel GeoJSON FeatureCollection must contain exactly one feature")
        feature = features[0]
    elif document.get("type") == "Feature":
        feature = document
    else:
        raise ValueError("parcel GeoJSON must be a Feature or one-feature FeatureCollection")
    properties = feature.get("properties", {})
    parcel_id = feature.get("id") or properties.get("parcel_id") or properties.get("parcelId")
    if not parcel_id or not feature.get("geometry"):
        raise ValueError("parcel feature must include an id/parcel_id and geometry")
    return str(parcel_id), feature["geometry"]


def _bbox(
    geometry: dict[str, Any], buffer_degrees: float = 0.001
) -> tuple[float, float, float, float]:
    def coords(node: Any) -> list[tuple[float, float]]:
        if isinstance(node, (list, tuple)) and len(node) >= 2 and isinstance(node[0], (int, float)):
            return [(float(node[0]), float(node[1]))]
        result: list[tuple[float, float]] = []
        if isinstance(node, (list, tuple)):
            for child in node:
                result.extend(coords(child))
        return result

    points = coords(geometry.get("coordinates", []))
    if not points:
        raise ValueError("parcel geometry has no coordinates")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return (
        min(xs) - buffer_degrees,
        min(ys) - buffer_degrees,
        max(xs) + buffer_degrees,
        max(ys) + buffer_degrees,
    )


def _evenly_spaced(items: list[dict[str, Any]], maximum: int) -> list[dict[str, Any]]:
    if len(items) <= maximum:
        return items
    if maximum <= 1:
        return [items[0]]
    indices = sorted({round(i * (len(items) - 1) / (maximum - 1)) for i in range(maximum)})
    return [items[index] for index in indices]


def _date_from_item(item: dict[str, Any]) -> date:
    value = item.get("properties", {}).get("datetime")
    if not value:
        raise ValueError("STAC item {} has no datetime".format(item.get("id")))
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def process_series(
    *,
    parcel_path: Path,
    output_dir: Path,
    start_date: str,
    end_date: str,
    max_per_sensor: int,
    max_cloud_cover: float,
    dry_run: bool,
    skip_existing: bool,
) -> None:
    parcel_id, geometry = _parcel(parcel_path)
    bbox = _bbox(geometry)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Parcel: {parcel_id}")
    print(f"Bbox: {bbox}")
    print(f"Window: {start_date} to {end_date}")

    # Sentinel-2
    s2_features = search_sentinel2_items(
        bbox, start_date, end_date, limit=100, max_cloud_cover=max_cloud_cover
    )
    s2_features.sort(key=lambda item: item.get("properties", {}).get("datetime", ""))
    s2_selected = _evenly_spaced(s2_features, max_per_sensor)
    print(f"\nSentinel-2 candidates: {len(s2_features)}; selected: {len(s2_selected)}")
    for item in s2_selected:
        print(
            "  ",
            item["id"],
            item["properties"].get("datetime"),
            "cloud=",
            item["properties"].get("eo:cloud_cover"),
        )

    if not dry_run:
        parcel_slug = parcel_id.replace(" ", "_")
        for item in s2_selected:
            item_id = item["id"]
            acquired = _date_from_item(item)
            output = output_dir / (
                "sentinel2_{}_{}.json".format(parcel_slug, acquired.strftime("%Y%m%d"))
            )
            if skip_existing and output.exists():
                print(f"  skip existing {output.name}")
                continue
            result = process_stac_item(item_id=item_id, parcel_id=parcel_id, geometry=geometry)
            output.write_text(
                json.dumps(result, indent=2, allow_nan=False) + "\n",
                encoding="utf-8",
            )
            print(
                "  wrote",
                output.name,
                "value=",
                result["observation"]["value"],
                "quality=",
                result["observation"]["quality_status"],
            )

    # Sentinel-1
    s1_features = search_sentinel1_items(
        bbox, start_date, end_date, limit=100, orbit_state="descending"
    )
    s1_features = [
        item
        for item in s1_features
        if item.get("id", "").startswith("S1C")
        and item.get("properties", {}).get("sat:orbit_state") == "descending"
    ]
    s1_features.sort(key=lambda item: item.get("properties", {}).get("datetime", ""))
    s1_selected = _evenly_spaced(s1_features, max_per_sensor)
    print(f"\nSentinel-1 candidates: {len(s1_features)}; selected: {len(s1_selected)}")
    for item in s1_selected:
        print("  ", item["id"], item["properties"].get("datetime"))

    if not dry_run:
        parcel_slug = parcel_id.replace(" ", "_")
        for item in s1_selected:
            item_id = item["id"]
            acquired = _date_from_item(item)
            output = output_dir / (
                "sentinel1_{}_{}.json".format(parcel_slug, acquired.strftime("%Y%m%d"))
            )
            if skip_existing and output.exists():
                print(f"  skip existing {output.name}")
                continue
            result = process_rtc_item(item_id=item_id, parcel_id=parcel_id, geometry=geometry)
            output.write_text(
                json.dumps(result, indent=2, allow_nan=False) + "\n",
                encoding="utf-8",
            )
            print(
                "  wrote",
                output.name,
                "status=",
                result["status"],
                "acquiredAt=",
                result["source"]["acquiredAt"],
            )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parcel", required=True, type=Path)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data" / "results",
    )
    parser.add_argument("--start-date", default="2026-06-01")
    parser.add_argument("--end-date", default="2026-12-31")
    parser.add_argument("--max-per-sensor", type=int, default=10)
    parser.add_argument("--max-cloud-cover", type=float, default=60.0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()
    process_series(
        parcel_path=args.parcel,
        output_dir=args.output_dir,
        start_date=args.start_date,
        end_date=args.end_date,
        max_per_sensor=args.max_per_sensor,
        max_cloud_cover=args.max_cloud_cover,
        dry_run=args.dry_run,
        skip_existing=args.skip_existing,
    )


if __name__ == "__main__":
    main()
