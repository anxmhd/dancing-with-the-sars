"""Sequence matched Sentinel-2 and Sentinel-1 observations around real NISAR dates.

This script is orchestration only: it discovers acquisitions for the selected
parcels, chooses the closest real Sentinel-1/2 acquisitions to each NISAR
acquisition date within a documented tolerance, and calls the existing
scientific processors. It does not reimplement parcel statistics, quality
masks, or calibration handling.

The NISAR acquisition dates below come from the NASA ASF DAAC search API for
NISAR_L2_GCOV_V1, descending track 23, covering the selected parcels. They are
discovery evidence only: a NISAR date in the campaign does not mean the product
was downloaded or processed.
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

from shapely.geometry import Point, shape

from dancing_with_sars.data_access.sentinel1 import process_rtc_item, search_sentinel1_items
from dancing_with_sars.data_access.sentinel2 import process_stac_item, search_sentinel2_items

# From NASA ASF DAAC search (platform=NISAR, collection NISAR_L2_GCOV_V1,
# descending track 23). Only the 2026-11-06 granule is available locally.
NISAR_ACQUISITIONS: tuple[tuple[str, str], ...] = (
    (
        "2026-08-14",
        "NISAR_L2_PR_GCOV_028_023_D_073_2005_DHDH_M_20260814T192030_20260814T192106_P05023_F_F_J_001",
    ),
    (
        "2026-08-26",
        "NISAR_L2_PR_GCOV_029_023_D_073_2005_DHDH_M_20260826T192030_20260826T192106_P05023_N_F_J_001",
    ),
    (
        "2026-09-07",
        "NISAR_L2_PR_GCOV_030_023_D_073_2005_DHDH_M_20260907T192030_20260907T192106_P05023_N_F_J_001",
    ),
    (
        "2026-09-19",
        "NISAR_L2_PR_GCOV_031_023_D_073_2005_DHDH_M_20260919T192030_20260919T192106_P05023_F_F_J_001",
    ),
    (
        "2026-10-01",
        "NISAR_L2_PR_GCOV_032_023_D_073_2005_DHDH_M_20261001T192030_20261001T192106_P05023_N_F_J_001",
    ),
    (
        "2026-10-13",
        "NISAR_L2_PR_GCOV_033_023_D_073_2005_DHDH_M_20261013T192030_20261013T192106_P05023_N_F_J_001",
    ),
    (
        "2026-10-25",
        "NISAR_L2_PR_GCOV_034_023_D_073_2005_DHDH_M_20261025T192030_20261025T192106_P05036_N_F_J_001",
    ),
    (
        "2026-11-06",
        "NISAR_L2_PR_GCOV_035_023_D_073_2005_DHDH_M_20261106T192031_20261106T192107_P05036_N_F_J_001",
    ),
)


@dataclass(frozen=True)
class Parcel:
    parcel_id: str
    slug: str
    geometry: dict[str, Any]
    bbox: tuple[float, float, float, float]


def _load_parcel(path: Path, buffer_degrees: float = 0.001) -> Parcel:
    document = json.loads(path.read_text(encoding="utf-8"))
    if document.get("type") != "Feature" or not document.get("geometry"):
        raise ValueError(f"{path.name} must be one GeoJSON Feature with geometry")
    properties = document.get("properties", {})
    parcel_id = document.get("id") or properties.get("parcel_id")
    if not parcel_id:
        raise ValueError(f"{path.name} must include an id or parcel_id")

    def coords(node: Any) -> list[tuple[float, float]]:
        if isinstance(node, (list, tuple)) and len(node) >= 2 and isinstance(node[0], (int, float)):
            return [(float(node[0]), float(node[1]))]
        result: list[tuple[float, float]] = []
        if isinstance(node, (list, tuple)):
            for child in node:
                result.extend(coords(child))
        return result

    points = coords(document["geometry"].get("coordinates", []))
    if not points:
        raise ValueError(f"{path.name} geometry has no coordinates")
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return Parcel(
        parcel_id=str(parcel_id),
        slug=str(parcel_id).replace(" ", "_"),
        geometry=document["geometry"],
        bbox=(
            min(xs) - buffer_degrees,
            min(ys) - buffer_degrees,
            max(xs) + buffer_degrees,
            max(ys) + buffer_degrees,
        ),
    )


def _item_date(item: dict[str, Any]) -> date:
    value = item.get("properties", {}).get("datetime")
    if not value:
        raise ValueError(f"STAC item {item.get('id')} has no datetime")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def _day_gap(item: dict[str, Any], target: date) -> int:
    return abs((_item_date(item) - target).days)


def _dominant_tile(candidates: list[dict[str, Any]]) -> str | None:
    """Pick the MGRS tile covering most of the parcel's acquisitions in the window.

    Adjacent Sentinel-2 tiles can both report the parcel location, but the
    campaign series must stay on one grid to avoid mixing tile geometry.
    """
    counts: dict[str, int] = {}
    for item in candidates:
        tile = item.get("properties", {}).get("s2:mgrs_tile")
        if tile:
            counts[tile] = counts.get(tile, 0) + 1
    return max(counts, key=lambda tile: counts[tile]) if counts else None


def _covers(item: dict[str, Any], point: Point) -> bool:
    """Require the item footprint itself to contain the parcel, not just its bounding box.

    A Sentinel-2 datatake returns items for neighbouring MGRS tiles whose scene
    bounding boxes overlap, so bbox intersection alone can select a tile that
    does not contain the parcel.
    """
    geometry = item.get("geometry")
    if geometry:
        return shape(geometry).covers(point)
    item_bbox = item.get("bbox")
    if not item_bbox or len(item_bbox) < 4:
        return False
    return item_bbox[0] <= point.x <= item_bbox[2] and item_bbox[1] <= point.y <= item_bbox[3]


def _select(
    candidates: list[dict[str, Any]],
    *,
    target: date,
    tolerance_days: int,
    excluded_ids: set[str],
    key: Any,
) -> dict[str, Any] | None:
    eligible = [
        item
        for item in candidates
        if item.get("id") not in excluded_ids and _day_gap(item, target) <= tolerance_days
    ]
    if not eligible:
        return None
    return min(eligible, key=lambda item: (key(item), _day_gap(item, target)))


def process_campaign(
    *,
    parcel_dir: Path,
    output_dir: Path,
    start_date: str,
    end_date: str,
    tolerance_days: int,
    max_cloud_cover: float,
    pause_seconds: float,
    dry_run: bool,
    skip_existing: bool,
) -> None:
    parcel_paths = sorted(parcel_dir.glob("*.geojson"))
    if not parcel_paths:
        raise ValueError(f"no parcel GeoJSON files found in {parcel_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    targets = [
        (date.fromisoformat(iso_date), iso_date, product_id)
        for iso_date, product_id in NISAR_ACQUISITIONS
        if start_date <= iso_date <= end_date
    ]

    print(
        f"Campaign: {start_date} to {end_date}; NISAR target dates: "
        f"{', '.join(iso for _, iso, _ in targets)}"
    )
    print(f"Temporal matching tolerance: +/-{tolerance_days} days")

    for parcel_path in parcel_paths:
        parcel = _load_parcel(parcel_path)
        centroid = shape(parcel.geometry).representative_point()
        print(f"\n=== {parcel.parcel_id}")
        s2_candidates = [
            item
            for item in search_sentinel2_items(
                parcel.bbox, start_date, end_date, limit=100, max_cloud_cover=max_cloud_cover
            )
            if _covers(item, centroid)
        ]
        tile = _dominant_tile(s2_candidates)
        if tile:
            s2_candidates = [
                item
                for item in s2_candidates
                if item.get("properties", {}).get("s2:mgrs_tile") == tile
            ]
        # Established campaign policy: Sentinel-1 RTC, descending orbit, S1C preference.
        s1_candidates = [
            item
            for item in search_sentinel1_items(
                parcel.bbox, start_date, end_date, limit=100, orbit_state="descending"
            )
            if item.get("id", "").startswith("S1C")
            and item.get("properties", {}).get("sat:orbit_state") == "descending"
            and _covers(item, centroid)
        ]
        print(
            f"  candidates: Sentinel-2={len(s2_candidates)} (tile {tile}), "
            f"Sentinel-1 descending={len(s1_candidates)}"
        )

        used_s2: set[str] = set()
        used_s1: set[str] = set()
        for target, iso_date, nisar_product in targets:
            s2_item = _select(
                s2_candidates,
                target=target,
                tolerance_days=tolerance_days,
                excluded_ids=used_s2,
                key=lambda item: item.get("properties", {}).get("eo:cloud_cover", 999),
            )
            s1_item = _select(
                s1_candidates,
                target=target,
                tolerance_days=tolerance_days,
                excluded_ids=used_s1,
                key=lambda item: 0,
            )
            print(f"  NISAR target {iso_date} ({nisar_product[:44]}...)")
            for label, item in (("Sentinel-2", s2_item), ("Sentinel-1", s1_item)):
                if item is None:
                    print(f"    {label}: no acquisition within tolerance")
                    continue
                acquired = _item_date(item)
                print(
                    f"    {label}: {item['id']} {acquired.isoformat()} "
                    f"gap={_day_gap(item, target)}d"
                )
                if label == "Sentinel-2":
                    used_s2.add(item["id"])
                else:
                    used_s1.add(item["id"])
                if dry_run:
                    continue
                prefix = "sentinel2" if label == "Sentinel-2" else "sentinel1"
                output = output_dir / f"{prefix}_{parcel.slug}_{acquired.strftime('%Y%m%d')}.json"
                if skip_existing and output.exists():
                    print(f"      skip existing {output.name}")
                    continue
                if label == "Sentinel-2":
                    result = process_stac_item(
                        item_id=item["id"], parcel_id=parcel.parcel_id, geometry=parcel.geometry
                    )
                    summary: Any = result["observation"]["value"]
                else:
                    result = process_rtc_item(
                        item_id=item["id"], parcel_id=parcel.parcel_id, geometry=parcel.geometry
                    )
                    summary = result["status"]
                # Public mirror tokens are rate limited; pause between acquisitions.
                time.sleep(pause_seconds)
                output.write_text(
                    json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8"
                )
                print(f"      wrote {output.name} summary={summary}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--parcel-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "examples" / "parcels",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data" / "results",
    )
    parser.add_argument("--start-date", default="2026-08-01")
    parser.add_argument("--end-date", default="2026-11-30")
    parser.add_argument("--tolerance-days", type=int, default=6)
    parser.add_argument("--max-cloud-cover", type=float, default=60.0)
    parser.add_argument("--pause-seconds", type=float, default=4.0)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()
    process_campaign(
        parcel_dir=args.parcel_dir,
        output_dir=args.output_dir,
        start_date=args.start_date,
        end_date=args.end_date,
        tolerance_days=args.tolerance_days,
        max_cloud_cover=args.max_cloud_cover,
        pause_seconds=args.pause_seconds,
        dry_run=args.dry_run,
        skip_existing=args.skip_existing,
    )


if __name__ == "__main__":
    main()
