# Dataset catalog and roadmap

The entries below record current evidence and access state. Processing status is not scientific validation; see [the first real-data result](FIRST_REAL_MULTISENSOR_RESULT.md) for exact products and limitations.

| Dataset | Intended role | Status | Important limit to verify |
|---|---|---|---|
| Sentinel-1 RTC | C-band radar backscatter | PROCESSED (one real acquisition) | Initial local parcel summary only; no independent/scientific validation and no trend. Product details and limits are in the result report. |
| NISAR GCOV | Complementary L-band radar backscatter | ACQUIRED, INSPECTED, PROCESSED (one real product; valid pixels for three of four evaluated parcels) | Supplied HDF5 product and masks were inspected and parcel windows processed. The original parcel's candidate pixels are excluded by the focus policy; three other El Haouz parcels pass it. Only one acquisition date is locally available. See [the product validation report](NISAR_GCOV_PRODUCT_VALIDATION.md) and [the campaign report](MULTISENSOR_CAMPAIGN_2026.md). |
| Sentinel-2 L2A | Optical vegetation indicator (NDVI) | PROCESSED (one real acquisition) | One real L2A item processed with B04/B08/SCL; provisional QA policy and no scientific validation. |
| CHIRPS | Regional rainfall context | PLANNED | Coarse resolution; not parcel-level rainfall. |
| ERA5-Land | Reanalysis climate and land-surface context | PLANNED | Model-based estimates at coarse resolution, not parcel measurements. |
| Moroccan agricultural parcel reference (Figshare article 28486022 v2) | Parcel geometry and historical survey labels | INSPECTED | Four parcel geometries are copied to small GeoJSON fixtures with attribution. Survey labels are not current ground truth for 2026 imagery; supplied NDVI CSVs are not integrated or treated as validation. |
| ESA WorldCover | Land-cover context | PLANNED | Product-year differences can reflect product methods as well as land change. |
| WorldPop | Population context | PLANNED | Population is not a direct measure of water use or groundwater extraction. |
| ABHT groundwater information | Possible secondary groundwater context | PLANNED | Relevant well measurements, locations, dates, and access remain unverified. |

## Verified source inspection (2026-11-14)

### Moroccan parcel and NDVI source

The public Figshare record [10.6084/m9.figshare.28486022.v2](https://doi.org/10.6084/m9.figshare.28486022.v2) reports **CC BY 4.0** for the dataset. Its two relevant downloadable RAR files were retrieved and listed/read for inspection; they remain under the ignored local `data/raw/` directory and are not committed. The separate 17.4 GB georeferenced-photo archive was not downloaded. The publication is [described in Scientific Data](https://www.nature.com/articles/s41597-026-06993-y); the article's license is distinct from the dataset record's license.

The parcel archive contains an ESRI Shapefile set (`.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`) with 10,383 polygon records. The `.prj` declares WGS 84 geographic coordinates; file bounds are approximately 9.466°W–5.647°W and 30.251°N–35.173°N. The attribute table includes `parcel_id`, survey `date`, `crop`, `season`, `tree`, `irrigation`, and `zone`. Survey dates span 2023-12-07 through 2025-01-30. The `zone` field includes Doukkala, Gharb, Tadla, Souss, El Haouz, and Statte. Attribute values are not fully normalized (for example, irrigation labels have case variants and one repeated value), so they need source-mapping review before classification or comparison.

The 67.6 MB Sentinel-2/NDVI archive contains 10,000 CSV members: 9,993 normal time series and seven byte-identical notebook checkpoint copies. Each normal filename stem, after removing `_S2_timeseries.csv`, exactly matches a unique shapefile `parcel_id`; there are no unmatched CSV IDs and 390 parcel IDs without a CSV. The El Haouz zone has 1,752 parcels, 1,750 with a matching file. See [the full join investigation](FIGSHARE_JOIN_INVESTIGATION.md) for the reproducible checks, date coverage, and limitations. The CSVs have no explicit ID column or product/acquisition/QA/provenance fields; exact file-to-parcel linkage does not validate the NDVI method or make the values independent ground truth.

### Initial satellite processing and access

On 2026-11-14, Copernicus STAC returned Sentinel-2 L2A item `S2C_MSIL2A_20261101T111211_N0513_R137_T29SPR_20261102T152046` for the selected Haouz parcel. Its B04/B08/SCL parcel windows were read from Microsoft Planetary Computer COG mirrors using temporary asset tokens and processed by the existing NDVI function. The Copernicus asset calibration and product identity were retained. This confirms access for this item and mirror workflow only; it does not establish a time series or access through Sentinel Hub.

The same check found Sentinel-1 RTC item `S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc` through the public Planetary Computer STAC. VV/VH parcel windows were processed separately as gamma-naught power; they are not compared numerically with NDVI.

The earlier anonymous ASF range request for NISAR GCOV product `NISAR_L2_PR_GCOV_035_023_D_073_2005_DHDH_M_20261106T192031_20261106T192107_P05036_N_F_J_001` returned HTTP 401. A user-supplied copy is now present under ignored `data/raw/nisar/`. Its internal granule ID, product metadata, grids, and quality masks were inspected; the corrected reader processed both available polarizations in Frequency A and B. All parcel candidate pixels are marked not fully focused, so no accepted parcel statistic was produced. The exact ASF item URL and transfer metadata were not retained. See [the NISAR validation report](NISAR_GCOV_PRODUCT_VALIDATION.md).
## Status meanings

- `PLANNED`: candidate identified, not yet inspected.
- `DISCOVERED`: a relevant collection/product has been located.
- `AVAILABLE`: actual access has been confirmed.
- `ACQUIRED`: data has been obtained.
- `INSPECTED`: metadata, structure, and quality have been examined.
- `PROCESSED`: a documented workflow has been applied.
- `VALIDATED`: relevant domain validation has been completed.
- `BLOCKED`: a concrete issue prevents progress.
- `DEFERRED`: deliberately postponed.

## Required metadata before integration

Record provider and official source, license, product and processing level, version, spatial and temporal resolution, coverage and dates, CRS, units, quality/uncertainty information, limitations, access method, and intended use. Keep sensor-specific properties intact; related variables from different sources are not interchangeable.

The Figshare archives remain in ignored `data/raw/`; one geometry copy used for the initial result is attributed in `backend/examples/el_haouz_parcel.geojson`, and the three campaign parcels are copied with attribution under `backend/examples/parcels/`. Two real satellite parcel summaries are in `data/results/`. Neither is scientifically validated. No satellite products, complete tiles, or NISAR HDF5 files were committed. Record source/product metadata, method, quality treatment, uncertainty, and reuse attribution for any additional processing.
