# Figshare parcel-to-NDVI join investigation

**Investigation date:** 2026-11-14  
**Dataset:** Figshare article 28486022, version 2  
**Status:** The file-to-parcel join is established for 9,993 time-series files by exact identifier equality. The supplied NDVI values are not yet suitable as independent scientific validation data.

## Executive result

The CSV archive has no `parcel_id` column, but each normal time-series filename contains an identifier that exactly equals one unique shapefile `parcel_id` after removing the `_S2_timeseries.csv` suffix. The 9,993 normal CSV identifiers are unique, all 9,993 match a shapefile identifier, and no shapefile identifier maps to more than one normal CSV. This supports a defensible one-to-one join for the matched subset. The join does not depend on archive order or a fuzzy comparison.

The shapefile has 10,383 unique parcel IDs, leaving **390 parcels without a normal NDVI CSV**. Of 1,752 records with `zone = el haouz`, **1,750 have a matching CSV** and two do not. These are counts of linked files, not counts of scientifically validated observations.

## Archives and inspection

Inspected the two relevant archives from the public [Figshare v2 record](https://doi.org/10.6084/m9.figshare.28486022.v2):

| Archive | Contents observed | Finding |
|---|---|---|
| `Shapefile_Crop and irrigation dataset.rar` (832,851 bytes) | `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg` | One 10,383-record polygon shapefile. `.cpg` declares UTF-8; `.prj` declares WGS 84 geographic coordinates. |
| `Sentinel2 bands and Ndvi for surveyed parcels.rar` (67,553,327 bytes) | 10,000 CSV members in class-named folders, including 7 Jupyter checkpoint copies | 9,993 normal `_S2_timeseries.csv` files plus 7 `-checkpoint.csv` copies. Each checkpoint copy is byte-identical to its corresponding normal file; checkpoints were excluded from join counts. |

Neither archive contains a README, manifest, CSV-to-parcel crosswalk, or other mapping document. The shapefile archive contains only the five shapefile components. The larger georeferenced-photo archive (17,441,559,260 bytes) was not downloaded. It is not needed to resolve the join: the shapefile's `photo` field points to photo paths, but the exact unique ID match already links the CSVs. Photos could be useful for later field-label quality review, which is outside this investigation.

The archives were inspected in place under the ignored local `data/raw/` directory. No source files were edited or added to Git.

## Shapefile schema and coverage

The `.dbf` and `.shx` each report 10,383 records; the `.shp` header declares Polygon geometry. The attribute fields are:

| Field | DBF type | Observed role / limitation |
|---|---|---|
| `parcel_id` | Character (80) | Non-empty, unique ID for all 10,383 records; exact key used in CSV filename comparison. |
| `date` | Date | Field/survey date; 39 distinct dates from 2023-12-07 through 2025-01-30. It is not the satellite observation date. |
| `crop` | Character (80) | Crop/land-cover label. Values include `Seasonal Crop`, `Trees`, `Bare soil`, `Weed`, `Trees + Seasonal`, and `Water`. |
| `season` | Character (80) | Present; the archive does not define its coding. |
| `tree` | Character (80) | Present; the archive does not define its coding. |
| `irrigation` | Character (80) | Irrigation label; includes blanks and inconsistent values/casing, so normalize only with a documented mapping. |
| `btw_lines`, `btw_trees`, `height`, `diameter`, `cp_height` | Numeric (24) | Numeric field observations; abbreviations/units are not defined in the archive. |
| `zone` | Character (80) | Administrative/region-like label used for the El Haouz count. Values include Doukkala, Gharb, Tadla, Souss, Statte, and `el haouz`. |
| `photo` | Character (80) | Relative `DCIM/...jpg` photo path; photographs are not required for the CSV join. |

The shapefile bounds are approximately 9.466°W–5.647°W and 30.251°N–35.173°N. El Haouz is selected using the actual DBF `zone` value, case-insensitively, rather than inferred from the broad bounding box.

## CSV schema and time coverage

All 9,993 normal series files share the same header:

```text
B1,B11,B12,B2,B3,B4,B5,B6,B7,B8,B8A,B9,NDVI,date
```

In representative files, band and NDVI cells are decimal numeric text and `date` is an ISO calendar date (`YYYY-MM-DD`). The CSV contains no explicit `parcel_id`, coordinate, acquisition/product identifier, QA flag, or processing/provenance fields. The filename stem is the parcel identifier; examples follow the pattern `<zone>_<class>_<survey-date>_<sequence>_S2_timeseries.csv`, but the join uses full literal equality with the shapefile key, not reconstruction from separate components.

Across the 9,993 normal files, the extracted time-series content has:

- 518,907 data rows and 152 distinct date labels, spanning 2024-01-01 through 2024-12-26.
- 18–98 unique date labels per file (median 35). Each parcel does not have the same date set; 127 distinct date-set patterns occur.
- At least one repeated date row in 4,231 files. There are 117,348 rows beyond a one-row-per-file/date count. The files have only a date column, not acquisition IDs/times, so these repeated rows cannot be safely deduplicated or interpreted as separate acquisitions from the archive alone.
- At least 10 and at most 9,993 parcel files with rows on a given global date label. The series therefore have uneven temporal coverage.

The NDVI CSV archive is not merely an annual mean table: it contains dated rows. However, its NDVI and band values are already processed values, not raw imagery.

## Candidate join keys and validation

| Candidate | Result | Evidence |
|---|---|---|
| Exact `parcel_id` = CSV basename without `_S2_timeseries.csv` | **Accepted for the matched subset** | 10,383 non-empty, unique shapefile IDs; 9,993 unique normal CSV stems; all 9,993 stems match exactly one shapefile ID; no duplicate CSV stems. |
| Archive/DBF row ordering | Rejected | No order/crosswalk documentation; exact IDs provide the join, so order must not be used. |
| Crop/zone/survey-date folder or filename components | Not used as an independent key | They are human-readable parts of the same filename identifier and are not guaranteed unique; case/label variants also exist. |
| CSV row coordinates or IDs | Not available | CSV columns contain bands, NDVI, and date only. |
| `photo` path | Not used | No photo archive was needed; the file key is already exact. |

Reconciliation results:

| Check | Result |
|---|---:|
| Shapefile records / unique `parcel_id` values | 10,383 / 10,383 |
| Normal time-series CSVs / unique filename IDs | 9,993 / 9,993 |
| CSV IDs matched to one shapefile parcel | 9,993 |
| CSV IDs with no shapefile match | 0 |
| Shapefile parcels with no normal CSV | 390 |
| Duplicate parcel IDs / duplicate normal CSV stems | 0 / 0 |
| One-to-many or many-to-one matches in the matched subset | 0 / 0 |
| Checkpoint files excluded (verified byte-identical to their normal counterpart) | 7 |

Unmatched parcels by `zone`: Doukkala 214, Tadla 98, Gharb 48, Souss 19, Statte 9, and El Haouz 2. Most unmatched records are weed labels and late-2024 survey groups, but this distribution does not establish why their time series are absent.

## El Haouz subset

| Measure | Result |
|---|---:|
| Shapefile parcels with `zone = el haouz` | 1,752 |
| Parcels with an exact matching NDVI CSV | 1,750 |
| Parcels without a matching NDVI CSV | 2 |
| Rows across the 1,750 matched files | 72,372 |
| Distinct date labels in the matched subset | 46 |
| Date span | 2024-01-11 through 2024-12-06 |
| Unique date labels per parcel | 33–46 (median 37) |
| El Haouz files with repeated date rows | 794 of 1,750 |
| Parcel files present per El Haouz date | 92–1,750; 24 dates occur in all 1,750 files |

Thus **1,750 El Haouz parcels have structurally linked NDVI files**, but not uniformly sampled series. These are not yet “usable” as validated science inputs: same-date row multiplicity, acquisition identity, cloud/quality treatment, product/version, scaling, and NDVI calculation method are unresolved.

## Scientific usability and provenance

- **Field observations:** The shapefile contains surveyed parcel polygons and field attributes with a field date. This is parcel-level reference information, but label definitions, measurement units, and normalization still need review.
- **Supplied satellite-derived values:** CSVs provide B1–B12, NDVI, and dates. Their naming identifies them as Sentinel-2-related, but no per-file product ID/version, reflectance encoding, QA/cloud policy, platform/acquisition ID, or processing method is included in the archive.
- **Independence:** Because the source and calculation history for the CSV NDVI is undocumented in these files, do not use it as an independent reference for validating a new Sentinel-2 NDVI pipeline until the authors' processing provenance is obtained. The CSV can be used as a linked exploratory series with its limitations clearly attached.
- **Temporal alignment:** Preserve duplicate same-date rows and gaps until their meaning is confirmed. Do not average, deduplicate, interpolate, or present them as one acquisition per date based on filename/date alone.
- **Scope of evidence:** An exact key match establishes the file-to-feature association represented by the shared source ID. It does not validate parcel geometry, field labels, satellite measurements, or the scientific correctness of the NDVI values.

## License and attribution

The Figshare v2 record lists **CC BY 4.0** for the dataset. Attribute the creators as named in the Figshare record, cite the dataset title and DOI, link the [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/), and indicate modifications when material is adapted. Do not imply the creators endorse the project. The Scientific Data article has its own license, which is different from the dataset record's license; do not assume article text/figures share the dataset's CC BY terms. No original dataset material is being redistributed in this repository.

## Reproducibility notes

The checks used only Python's standard library and the Windows `tar.exe` available in this environment. No scientific dependencies or satellite products were needed. Starting with the downloaded archives in ignored `data/raw/figshare-28486022-v2/`:

```powershell
tar.exe -tf "data/raw/figshare-28486022-v2/Shapefile_Crop and irrigation dataset.rar"
tar.exe -tf "data/raw/figshare-28486022-v2/Sentinel2 bands and Ndvi for surveyed parcels.rar"
New-Item -ItemType Directory -Force "data/raw/figshare-28486022-v2/inspection/ndvi" | Out-Null
tar.exe -xf "data/raw/figshare-28486022-v2/Sentinel2 bands and Ndvi for surveyed parcels.rar" `
  -C "data/raw/figshare-28486022-v2/inspection/ndvi"
```

The reconciliation rule is:

```python
import struct
from collections import Counter
from pathlib import Path

def read_dbf_text_field(dbf_path: Path, field_name: str) -> list[str]:
    data = dbf_path.read_bytes()
    count, header_size, record_size = struct.unpack_from("<IHH", data, 4)
    fields = []
    cursor = 32
    data_offset = 1  # each DBF record begins with a deletion marker byte
    while data[cursor] != 0x0D:
        descriptor = data[cursor : cursor + 32]
        name = descriptor[:11].split(b"\0", 1)[0].decode("ascii")
        width = descriptor[16]
        fields.append((name, data_offset, width))
        data_offset += width
        cursor += 32
    _, start, width = next(item for item in fields if item[0] == field_name)
    values = []
    for index in range(count):
        record = data[header_size + index * record_size : header_size + (index + 1) * record_size]
        if record[:1] != b"*":
            values.append(record[start : start + width].decode("utf-8").strip())
    return values

base = Path("data/raw/figshare-28486022-v2/inspection")
parcel_ids = read_dbf_text_field(base / "lulc_fielddata.dbf", "parcel_id")
series_paths = [
    path for path in (base / "ndvi").rglob("*_S2_timeseries.csv")
    if path.name.endswith("_S2_timeseries.csv")
]
csv_ids = [path.name.removesuffix("_S2_timeseries.csv") for path in series_paths]
duplicates = {key: count for key, count in Counter(csv_ids).items() if count > 1}
parcel_set = set(parcel_ids)
csv_set = set(csv_ids)
assert len(parcel_ids) == len(parcel_set) == 10_383
assert len(csv_ids) == len(csv_set) == 9_993
assert not duplicates and csv_set <= parcel_set
print("matched CSVs:", len(csv_set & parcel_set))
print("unmatched CSVs:", len(csv_set - parcel_set))
print("unmatched parcels:", len(parcel_set - csv_set))
```

The `.cpg` specifies UTF-8. The counts above are from the full archives, not a sample. CSV temporal counts were obtained by iterating each normal file with Python's standard-library `csv.DictReader`, parsing each `date` value as an ISO date, and counting per-file row/date sets.

## Remaining uncertainties and next steps

1. Ask the dataset authors to document the meaning of the sequence component in `parcel_id` and confirm that the exact shared ID is the intended linkage (the archive itself provides no README/crosswalk).
2. Ask for CSV provenance: source collection/product/version, acquisition identifier/time, pixel/spatial aggregation, reflectance scaling, cloud/QA filtering, and NDVI calculation procedure.
3. Ask why 390 parcel IDs have no CSV and why two El Haouz series are absent; do not infer that a missing file means no satellite observation.
4. Clarify repeated same-date rows before temporal aggregation or comparison.
5. Keep the 1,750 El Haouz links as a candidate reference subset only. Before validation use, establish whether CSV series are independent of the future processing path and compare a documented sample with approved source imagery and QA.
