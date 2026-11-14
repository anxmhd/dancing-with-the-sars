# First real multisensor result

**Run date:** 2026-11-14
**Scope:** one reference parcel, one Sentinel-2 L2A acquisition, one Sentinel-1 RTC acquisition, and NISAR GCOV catalog discovery.
**Validation status:** software-tested and executed on real Sentinel-2 and Sentinel-1 assets; not independently scientifically validated. No NISAR raster measurement was produced.

> **Update (2026-11-14):** A user-supplied copy of the previously identified NISAR GCOV product was later read and inspected. The corrected reader excluded all candidate pixels for the El Haouz parcel because the product's GCOV and channel focus-validity masks do not mark them valid. The updated finding and result artifact are in [NISAR_GCOV_PRODUCT_VALIDATION.md](NISAR_GCOV_PRODUCT_VALIDATION.md). The NISAR section below records the earlier catalog-only state and is superseded by that report.

## Selected reference parcel

The selected feature is `el haouz_Trees_20240110_036`, an 8-vertex WGS 84 polygon from the Figshare article 28486022 v2 parcel archive. Its source survey date is 2024-01-10 and the source labels it “Trees” and “Drip Irrigation”. Those labels describe that survey record; they have not been checked as current ground conditions. The small reproducibility copy is [el_haouz_parcel.geojson](../backend/examples/el_haouz_parcel.geojson). The dataset record reports CC BY 4.0 ([Figshare DOI](https://doi.org/10.6084/m9.figshare.28486022.v2)).

## Sentinel-2 L2A observation

- **Source/product:** Copernicus Data Space `sentinel-2-l2a`; `S2C_MSIL2A_20261101T111211_N0513_R137_T29SPR_20261102T152046`, processing baseline 05.13, Sentinel-2C, tile 29SPR, relative orbit 137.
- **Acquired:** 2026-11-01 11:12:11.025 UTC. STAC tile cloud cover is 0.0%; parcel pixels were separately screened using SCL.
- **Inputs:** B04 red and B08 NIR, both 10 m, scale `0.0001`, offset `-0.1` from the Copernicus STAC asset metadata; SCL at 20 m. The SCL classes were aligned to the reflectance grid using nearest neighbor, which preserves categorical values. Processing was limited to the parcel windows from the public Planetary Computer COG mirror, with the exact source product and calibration metadata retained from Copernicus STAC.
- **Quality and summary:** SCL classes 0, 1, 3, 8, 9, 10, and 11 excluded; center-in-pixel polygon rasterization; median aggregation; minimum 5 valid pixels and 50% valid coverage. 22 of 22 parcel pixels passed (100%); none were excluded by those SCL classes. Classes 2 (dark area) and 7 (unclassified) were retained, so the screening is provisional.
- **Derived indicator:** median parcel NDVI **0.368249284984567** (dimensionless), calculated from scaled surface reflectance. This is one vegetation-index observation. It does not establish vegetation health, stress, irrigation, drought impact, or cause.
- **Reproducible output:** [sentinel2_el_haouz_Trees_20240110_036_20261101.json](../data/results/sentinel2_el_haouz_Trees_20240110_036_20261101.json). It records the exact grids, scales, offsets, source IDs, quality policy, counts, and result.

The [Copernicus STAC item](https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a/items/S2C_MSIL2A_20261101T111211_N0513_R137_T29SPR_20261102T152046) is the source of the product metadata and band calibration; the [Sentinel-2 L2A product reference](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel2.html) describes the product. The mirror provides public, short-lived signed access to the small windows; no full tile was downloaded.

## Sentinel-1 C-band observation

- **Source/product:** Microsoft Planetary Computer `sentinel-1-rtc` item `S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc` (underlying GRD product identifier `S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_DEAB`).
- **Acquired:** 2026-10-26 06:28:03.880 UTC; Sentinel-1C, C-band, 5.405 GHz, IW mode, descending relative orbit 154. The RTC item's VV/VH assets are described as terrain-corrected gamma-naught values, Float32, at 10 m posting, with nodata `-32768`. STAC does not declare a unit, scale, or offset. Values are preserved as stored and summarized as dimensionless gamma-naught power in linear units (not dB); that interpretation is based on the product quantity, and the missing explicit unit/scaling fields remain a source metadata limitation.
- **Processing and summary:** parcel-center inclusion; finite, nonnegative, non-nodata values only; no additional speckle filtering or QA-mask filtering by this workflow. Each polarization had 22/22 valid parcel pixels. Median gamma-naught power was **VV 0.12140032649040222** and **VH 0.016289573162794113** (dimensionless, unscaled stored values; not dB). The STAC record does not provide per-pixel incidence-angle metadata in this workflow.
- **Reproducible output:** [sentinel1_el_haouz_Trees_20240110_036_20261026.json](../data/results/sentinel1_el_haouz_Trees_20240110_036_20261026.json).

The product's asset descriptions identify the values as terrain-corrected gamma-naught. Copernicus describes its Sentinel-1 RTC family as terrain-corrected backscatter products ([Sentinel-1 documentation](https://documentation.dataspace.copernicus.eu/Data/SentinelMissions/Sentinel1.html)); the [Planetary Computer item](https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-1-rtc/items/S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc) supplies the actual asset and acquisition metadata. These C-band values are not soil-moisture estimates.

## NISAR L-band catalog result and access blocker

ASF SearchAPI returned the following GCOV frame for a search at the reference parcel centroid:

- **Product:** `NISAR_L2_PR_GCOV_035_023_D_073_2005_DHDH_M_20261106T192031_20261106T192107_P05036_N_F_J_001` in collection `NISAR_L2_GCOV_V1` (validated maturity collection).
- **Acquired:** 2026-11-06 19:20:31–19:21:07 UTC; descending; dual-pol HH/HV; range bandwidths 20 MHz (Frequency A) and 5 MHz (Frequency B). ASF's GCOV guide describes Frequency A land products at 20 m for 20 MHz and Frequency B products at 80 m for 5 MHz. GCOV diagonal layers are calibrated, terrain-corrected gamma-zero power. The product file listed by ASF is 1,967,128,576 bytes.
- **Coverage:** the ASF spatial search at the parcel centroid returned this frame. That verifies a candidate acquisition over the point of interest, not pixel-level product quality for the parcel.
- **Access blocker:** an anonymous one-byte HTTP Range request to the product URL returned **HTTP 401**. ASF's access guidance requires an Earthdata Login bearer token for HTTPS access. No token was available in this environment and no token was requested or exposed in project files. The HDF5 product was not downloaded; **there is no NISAR parcel value in this report**.

The implemented [NISAR GCOV reader](../backend/src/dancing_with_sars/science/radar/nisar_gcov.py) accepts a locally downloaded product, reads one real diagonal covariance term and its coordinates/projection, and summarizes only a small parcel window. It preserves the source units, grid, valid-pixel count, number-of-looks summary, and unfiltered mask-value counts. The product mask is not yet interpreted as a rejection rule. NISAR's [GCOV guide](https://nisar-docs.asf.alaska.edu/gcov/), [data maturity notes](https://nisar-docs.asf.alaska.edu/products-overview/), and [ASF data-access cookbook](https://asfopensarlab.github.io/NISAR_Cookbook/search-stream-nisar-asf-search/) describe product semantics, maturity and Earthdata authentication. Processing is blocked until the exact HDF5 file is obtained with an Earthdata Login and the reader is checked against that product's metadata.

## Cross-sensor limits

The Sentinel-1 and Sentinel-2 acquisitions are six days apart; the cataloged NISAR acquisition is five days after Sentinel-2. The two processed sensors report different quantities: an optical vegetation index versus C-band radar gamma-naught power. NISAR would provide L-band gamma-zero power with different frequency, polarization and acquisition geometry. The numeric values are therefore retained separately; no correlation, direct equivalence, temporal trend, causal statement or stress classification is inferred.

The reference parcel's crop/irrigation labels date from January 2024, whereas these satellite observations are from October/November 2026. They are not contemporaneous validation data. Each result is one date only and cannot support a trend. Further review is needed for the provisional SCL class set, parcel pixel rule, minimum coverage thresholds, Sentinel-1 RTC preprocessing details, NISAR mask policy and independent value validation.

## Reproduction

From `backend/`, after `uv sync --locked`, run:

```powershell
uv run --locked python -m dancing_with_sars.data_access.sentinel2 `
  --item-id S2C_MSIL2A_20261101T111211_R137_T29SPR_20261102T152046 `
  --parcel examples/el_haouz_parcel.geojson `
  --output ../data/results/sentinel2_el_haouz_Trees_20240110_036_20261101.json

uv run --locked python -m dancing_with_sars.data_access.sentinel1 `
  --item-id S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc `
  --parcel examples/el_haouz_parcel.geojson `
  --output ../data/results/sentinel1_el_haouz_Trees_20240110_036_20261026.json
```

After downloading the exact NISAR product into ignored `data/raw/` with Earthdata authentication, process its Frequency A HHHH layer with:

```powershell
uv run --locked python -m dancing_with_sars.science.radar.nisar_gcov `
  --product ../data/raw/NISAR_L2_PR_GCOV_035_023_D_073_2005_DHDH_M_20261106T192031_20261106T192107_P05036_N_F_J_001.h5 `
  --parcel examples/el_haouz_parcel.geojson `
  --output ../data/results/nisar_gcov_el_haouz_Trees_20240110_036_20261106.json
```

The automated suite uses only small synthetic fixtures; it does not download satellite products. Tests establish code behavior, not source-product calibration or scientific validity.
