# NISAR-guided multisensor parcel campaign (2026-08-14 – 2026-11-06)

**Status:** three parcels selected from demonstrated NISAR validity; Sentinel-1 and Sentinel-2
series processed for those same parcels; repeated NISAR acquisitions are **not** available because
NISAR GCOV download requires Earthdata Login credentials that were not present in this environment.
**Processing date:** 2026-11-15.

This campaign builds acquisition artifacts only. It does not validate the science of the existing
processors, and it does not compare sensors numerically.

## 1. Concept chain and counts

| Stage | Meaning | Count |
|---|---|---:|
| Candidate parcels examined | Figshare El Haouz reference parcels evaluated against the local NISAR granule | 4 |
| Selected parcels | Passed the unchanged NISAR focus/quality policy on 2026-11-06 | 3 |
| NISAR acquisitions processed | One granule × three parcels | 3 observations |
| NISAR acquisitions discoverable | Descending track 23 GCOV in the campaign window | 8 dates |
| Sentinel-1 acquisitions processed | Same parcels, matched to NISAR dates | 23 observations |
| Sentinel-2 acquisitions processed | Same parcels, matched to NISAR dates | 23 observations (20 accepted, 3 quality-excluded) |
| Temporally matched observations | Sentinel-1/2 within ±6 days of a real NISAR date | all processed S1/S2 rows |

A "selected" parcel is not a "validated" parcel: NISAR validity here means the product's own mask
and focus-validity bits accepted its pixels, not that the backscatter is scientifically verified.

## 2. Parcel selection

Candidates were evaluated against the one locally available NISAR granule
`NISAR_L2_PR_GCOV_035_023_D_073_2005_DHDH_M_20261106T192031_20261106T192107_P05036_N_F_J_001`
using the existing reader and its unchanged rules: GCOV mask 0 and 255 excluded, HH focus bit 256 /
HV focus bit 512 required, sample-slip flag 2 excluded, declared `_FillValue` handling unchanged.

| Parcel ID | Historical survey label | A/HH accepted | B/HH accepted | Outcome |
|---|---|---|---:|---:|---|
| `el haouz_Trees_20240110_026` | Trees, Citrus fruits, drip irrigation (2024-01-10) | 1021/1021 | 65/65 | selected |
| `el haouz_Trees_20231221_083` | Trees, Olives, drip irrigation (2023-12-21) | 816/816 | 52/52 | selected |
| `el haouz_Bare soil_20231221_021` | Bare soil (2023-12-21) | 992/992 | 62/62 | selected |
| `el haouz_Trees_20240110_036` | Trees, Citrus fruits, drip irrigation (2024-01-10) | 0/6 | 0/1 | rejected; existing series kept |

All three selected parcels had 100% valid candidate pixels in both frequencies and both
polarizations. They were chosen because they passed the mask, offer different historical reference
categories, and are large enough (0.33–0.41 km²) for parcel-window sampling. Their geometry is
copied to `backend/examples/parcels/` with source attribution.

The survey labels are historical field reference information from 2023–2024 and are **not** 2026
ground truth. They were not used to select parcels.

## 3. Campaign period

The four-month window is derived from actual NISAR availability, not from a preferred calendar
range. NASA ASF DAAC search for `NISAR_L2_GCOV_V1`, descending track 23 over the parcels, returns
GCOV granules on:

2026-08-14, 2026-08-26, 2026-09-07, 2026-09-19, 2026-10-01, 2026-10-13, 2026-10-25, 2026-11-06

That is the 12-day NISAR repeat cadence, so the campaign window is **2026-08-14 to 2026-11-06**.

Only the 2026-11-06 granule exists locally. The download endpoint for the other seven redirects to a
signed URL that returns `401 HTTP Basic: Access denied`; no Earthdata Login credentials are
configured here. Those seven dates are recorded as discoverable-but-unavailable, not as missing
satellite acquisitions and not as processed results.

## 4. Temporal matching policy

For each real NISAR date, the closest real Sentinel-1 and Sentinel-2 acquisitions were selected
inside a **±6-day tolerance**; the actual separation is stored implicitly by the acquisition dates
and listed below. No interpolation or date shifting was applied, and no acquisition is reused for
two NISAR dates.

- Sentinel-1: existing RTC collection, descending orbit only, S1C preference, no ascending mixing.
- Sentinel-2: L2A, product cloud cover ≤60% for candidate discovery, SCL pixel masking as before.
- Where a parcel's candidates span two MGRS tiles, the parcel's dominant tile in the window is used
  so one series stays on one grid.

Sentinel-1 separations were 1 day for 21 of 23 acquisitions and 6 days for the remaining two.
Sentinel-2 separations were 1–6 days (8 at 1 day, 5 at 5 days, 3 each at 2, 3 and 6 days, 1 at 4 days).

## 5. Acquisition inventory

Legend: `status` is the artifact status; `valid/total` are parcel pixel centers. Sentinel-2 rows
report NDVI (unit 1); Sentinel-1 rows report median VV gamma-zero linear power (unit 1); NISAR rows
report median A/HH gamma-zero linear power.

### 5.1 `el haouz_Bare soil_20231221_021`

| Date | Sensor | Status | Value | Valid/total | Days to nearest NISAR date |
|---|---|---|---:|---:|---:|
| 2026-08-15 | Sentinel-1 | available | 0.0410 | 3987/3987 | 1 |
| 2026-08-18 | Sentinel-2 | accepted | 0.1337 | 3987/3987 | 4 |
| 2026-08-27 | Sentinel-1 | available | 0.0431 | 3987/3987 | 1 |
| 2026-08-28 | Sentinel-2 | accepted | 0.1314 | 3987/3987 | 2 |
| 2026-09-08 | Sentinel-1 | available | 0.0439 | 3987/3987 | 1 |
| 2026-09-12 | Sentinel-2 | accepted | 0.1391 | 3987/3987 | 5 |
| 2026-09-20 | Sentinel-1 | available | 0.0436 | 3987/3987 | 1 |
| 2026-09-22 | Sentinel-2 | accepted | 0.1430 | 3987/3987 | 3 |
| 2026-10-02 | Sentinel-1 | available | 0.0427 | 3987/3987 | 1 |
| 2026-10-07 | Sentinel-2 | excluded | null | 1968/3987 | 6 |
| 2026-10-12 | Sentinel-2 | accepted | 0.1442 | 3987/3987 | 1 |
| 2026-10-14 | Sentinel-1 | available | 0.0415 | 3987/3987 | 1 |
| 2026-10-24 | Sentinel-2 | accepted | 0.1330 | 3987/3987 | 1 |
| 2026-10-26 | Sentinel-1 | available | 0.0405 | 3987/3987 | 1 |
| 2026-10-31 | Sentinel-1 | available | 0.0541 | 3987/3987 | 6 |
| 2026-11-06 | NISAR | available | 0.0491 (A/HH) | 992/992 | 0 |

### 5.2 `el haouz_Trees_20231221_083`

| Date | Sensor | Status | Value | Valid/total | Days to nearest NISAR date |
|---|---|---|---:|---:|---:|
| 2026-08-13 | Sentinel-2 | accepted | 0.4842 | 3264/3264 | 1 |
| 2026-08-15 | Sentinel-1 | available | 0.0986 | 3264/3264 | 1 |
| 2026-08-23 | Sentinel-2 | accepted | 0.3640 | 3264/3264 | 3 |
| 2026-08-27 | Sentinel-1 | available | 0.0948 | 3264/3264 | 1 |
| 2026-09-08 | Sentinel-1 | available | 0.1035 | 3264/3264 | 1 |
| 2026-09-12 | Sentinel-2 | accepted | 0.4748 | 3264/3264 | 5 |
| 2026-09-17 | Sentinel-2 | accepted | 0.4799 | 3264/3264 | 2 |
| 2026-09-20 | Sentinel-1 | available | 0.0986 | 3264/3264 | 1 |
| 2026-10-02 | Sentinel-1 | available | 0.1007 | 3264/3264 | 1 |
| 2026-10-07 | Sentinel-2 | excluded | null | 0/3264 | 6 |
| 2026-10-12 | Sentinel-2 | accepted | 0.5517 | 3264/3264 | 1 |
| 2026-10-14 | Sentinel-1 | available | 0.1022 | 3264/3264 | 1 |
| 2026-10-24 | Sentinel-2 | accepted | 0.5151 | 3264/3264 | 1 |
| 2026-10-26 | Sentinel-1 | available | 0.0924 | 3264/3264 | 1 |
| 2026-10-31 | Sentinel-1 | available | 0.1089 | 3264/3264 | 6 |
| 2026-11-01 | Sentinel-2 | accepted | 0.5297 | 3264/3264 | 5 |
| 2026-11-06 | NISAR | available | 0.1412 (A/HH) | 816/816 | 0 |

### 5.3 `el haouz_Trees_20240110_026`

| Date | Sensor | Status | Value | Valid/total | Days to nearest NISAR date |
|---|---|---|---:|---:|---:|
| 2026-08-13 | Sentinel-2 | accepted | 0.5007 | 4124/4124 | 1 |
| 2026-08-15 | Sentinel-1 | available | 0.1062 | 4124/4124 | 1 |
| 2026-08-27 | Sentinel-1 | available | 0.1023 | 4124/4124 | 1 |
| 2026-08-28 | Sentinel-2 | accepted | 0.4780 | 4124/4124 | 2 |
| 2026-09-08 | Sentinel-1 | available | 0.1187 | 4124/4124 | 1 |
| 2026-09-12 | Sentinel-2 | accepted | 0.5322 | 4124/4124 | 5 |
| 2026-09-20 | Sentinel-1 | available | 0.1174 | 4124/4124 | 1 |
| 2026-09-22 | Sentinel-2 | accepted | 0.6213 | 4124/4124 | 3 |
| 2026-10-02 | Sentinel-1 | available | 0.1082 | 4124/4124 | 1 |
| 2026-10-07 | Sentinel-2 | excluded | null | 0/4124 | 6 |
| 2026-10-12 | Sentinel-2 | accepted | 0.6417 | 4124/4124 | 1 |
| 2026-10-14 | Sentinel-1 | available | 0.1146 | 4124/4124 | 1 |
| 2026-10-24 | Sentinel-2 | accepted | 0.6475 | 4124/4124 | 1 |
| 2026-10-26 | Sentinel-1 | available | 0.0999 | 4124/4124 | 1 |
| 2026-11-01 | Sentinel-2 | accepted | 0.6325 | 4124/4124 | 5 |
| 2026-11-06 | NISAR | available | 0.2334 (A/HH) | 1021/1021 | 0 |

Full NISAR channels for 2026-11-06 (median linear power, unit 1):

| Parcel | A/HH | A/HV | B/HH | B/HV | A grid | B grid |
|---|---:|---:|---:|---:|---|---|
| Bare soil 021 | 0.0491 | 0.0063 | 0.0655 | 0.0082 | 20 m | 80 m |
| Trees 083 | 0.1412 | 0.0312 | 0.1555 | 0.0381 | 20 m | 80 m |
| Trees 026 | 0.2334 | 0.0372 | 0.2582 | 0.0409 | 20 m | 80 m |

Frequency A (center 1.229 GHz) and Frequency B (1.2935 GHz, 80 m) are separate observations and are
not averaged. HH and HV are separate measurements. These values are not comparable in magnitude
with Sentinel-1 C-band VV/VH, and no such comparison is made here.

## 6. Monthly coverage

| Month | NISAR processed | Sentinel-1 | Sentinel-2 | Sentinel-2 excluded |
|---|---:|---:|---:|---:|
| 2026-08 | 0 (2 discoverable) | 6 | 6 | 0 |
| 2026-09 | 0 (2 discoverable) | 6 | 6 | 0 |
| 2026-10 | 0 (3 discoverable) | 11 | 9 | 3 |
| 2026-11 (to 11-06) | 3 | 0 | 2 | 0 |

Counts aggregate the three parcels. NISAR discoverable counts are catalog evidence only.
Sentinel-1 has no November acquisition within tolerance for any parcel (the next S1C pass is
2026-11-12, 6 days after the NISAR date for two parcels and outside the tile coverage for the third).

## 7. Quality and exclusions

- NISAR: all 12 channel measurements across the three parcels were accepted with 100% valid
  candidate pixels; no mask relaxation was applied.
- Sentinel-1: 23/23 observations returned accepted VV and VH summaries with 100% valid parcel
  pixels.
- Sentinel-2: 20/23 accepted. The 2026-10-07 acquisition was excluded by the unchanged SCL policy
  for all three parcels (valid fractions 0.0, 0.0 and 0.494 — below the 0.5 minimum). It is retained
  as an excluded observation rather than deleted.
- Sentinel-2 2026-11-06 for the bare-soil parcel: no acquisition within ±6 days, recorded as absent.
- Sentinel-1 2026-11-06 for parcel 026: no S1C descending acquisition within ±6 days, recorded as
  absent.

## 8. Artifacts

One JSON file per acquisition in `data/results/`, named
`sentinel1_<parcel_slug>_<YYYYMMDD>.json`, `sentinel2_<parcel_slug>_<YYYYMMDD>.json`, and
`nisar_gcov_<parcel_slug>_<YYYYMMDD>.json`, using the actual acquisition date. All are strict JSON
(`allow_nan=False`). Existing parcel-036 artifacts were not modified.

Parcel windows for visualization were **not** produced. The existing processors return parcel
summaries, not pixel arrays; emitting raster windows would require changing their public output
(an architectural change). It is documented as remaining work rather than done as a side effect.

## 9. Verification performed

- `uv run ruff check .` — passed.
- `uv run pytest -q` — 26 passed.
- Strict JSON parse of all 49 new artifacts, with a parser that rejects `NaN`/`Infinity`.
- Filename/artifact parity for parcel slug, acquisition date and mission.
- Sensor semantics: NISAR 4 distinct A/B × HH/HV channels with validity bits 256/512 and consistent
  quality arithmetic; Sentinel-1 VV and VH with unit 1; Sentinel-2 unchanged NDVI method and SCL
  policy.
- Each artifact serialized by `dancing_with_sars.api.serializers` and validated against
  `contracts/multisensor-response.schema.json` inside a response envelope — 49/49 passed.
- `git diff --check` — passed.

These checks establish structure, provenance presence and software behaviour. They do not establish
calibration accuracy, field validity, or scientific interpretation.

## 10. Remaining limitations

- **No repeated NISAR series.** One NISAR date exists for the three parcels; seven further
  acquisitions are catalogued but blocked by missing Earthdata credentials.
- The NISAR site mask behaviour is per-granule. Validity on 2026-11-06 does not imply validity on the
  other seven dates.
- NISAR acceptance applies to a small number of pixel centers (992, 816, 1021 on the 20 m grid and
  52–65 on the 80 m grid); Frequency B samples are sparse relative to parcel size.
- Cloud exclusion removes all Sentinel-2 October 7 observations; no interpolation was used.
- Sentinel-1 lacks a November date; the series ends 2026-10-31 for two parcels and 2026-10-26 for
  the third.
- Historical Figshare labels describe 2023–2024 surveys, not 2026 conditions, and parcel boundaries
  are not field-verified for 2026.
- No field measurements, no independent calibration reference, and no validated drought, irrigation,
  stress or groundwater interpretation exist. NDVI and backscatter changes are observational only.
- The local NISAR product's exact catalog transfer record and maturity metadata were not retained.
