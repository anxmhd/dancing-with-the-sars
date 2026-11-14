# Dataset catalog and roadmap

The entries below are candidate sources from the project constitution. Every entry starts as `PLANNED`; none has been accessed, acquired, inspected, processed, or validated in this repository.

| Dataset | Intended role | Status | Important limit to verify |
|---|---|---|---|
| Sentinel-1 | Historical C-band radar observations | PLANNED | Product type, coverage, geometry, and suitability depend on task and period. |
| NISAR | Complementary L-band observations | PLANNED | Actual product availability, maturity, coverage, and product type must be checked. |
| Sentinel-2 | Optical vegetation indicators such as NDVI/NDMI | DISCOVERED | Copernicus Data Space documents Sentinel-2 L2A and a global `sentinel-2-l2a` STAC collection. Coverage on an identified parcel and acquisition dates has not been queried; an account and OAuth client are needed for Sentinel Hub processing requests. |
| CHIRPS | Regional rainfall context | PLANNED | Coarse resolution; not parcel-level rainfall. |
| ERA5-Land | Reanalysis climate and land-surface context | PLANNED | Model-based estimates at coarse resolution, not parcel measurements. |
| Moroccan agricultural ground truth (Figshare article 28486022 v2) | Parcel/crop/irrigation reference information and supplied Sentinel-2 band/NDVI series | INSPECTED | Archive contents and license were inspected. The NDVI CSV-to-parcel join, processing metadata, and representativeness still need review; the source is not integrated or scientifically validated. |

## Verified source inspection (2026-11-14)

### Moroccan parcel and NDVI source

The public Figshare record [10.6084/m9.figshare.28486022.v2](https://doi.org/10.6084/m9.figshare.28486022.v2) reports **CC BY 4.0** for the dataset. Its two relevant downloadable RAR files were retrieved and listed/read for inspection; they remain under the ignored local `data/raw/` directory and are not committed. The separate 17.4 GB georeferenced-photo archive was not downloaded. The publication is [described in Scientific Data](https://www.nature.com/articles/s41597-026-06993-y); the article's license is distinct from the dataset record's license.

The parcel archive contains an ESRI Shapefile set (`.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`) with 10,383 polygon records. The `.prj` declares WGS 84 geographic coordinates; file bounds are approximately 9.466°W–5.647°W and 30.251°N–35.173°N. The attribute table includes `parcel_id`, survey `date`, `crop`, `season`, `tree`, `irrigation`, and `zone`. Survey dates span 2023-12-07 through 2025-01-30. The `zone` field includes Doukkala, Gharb, Tadla, Souss, El Haouz, and Statte. Attribute values are not fully normalized (for example, irrigation labels have case variants and one repeated value), so they need source-mapping review before classification or comparison.

The 67.6 MB Sentinel-2/NDVI archive contains 10,000 CSV files. A representative file has columns `B1` through `B12`, `NDVI`, and `date`, with 65 dated rows from 2024-01-11 through 2024-12-24. This confirms that the archive includes acquisition-date series, resolving the article metadata's ambiguity about annual averages. However, the CSV schema has no explicit `parcel_id`; filenames encode region/category/date/sequence, but a stable join to the shapefile's `parcel_id` has not been established. Product collection/version, reflectance scaling, QA filtering, and the provenance of the supplied NDVI values also remain insufficiently documented for reproducible integration. Do not join, relabel, or treat these values as validated outputs until those gaps are resolved.

### Sentinel-2 access

The [Copernicus Data Space Sentinel-2 collection](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2) and its [STAC documentation](https://documentation.dataspace.copernicus.eu/APIs/STAC.html) identify Sentinel-2 L2A and a global `sentinel-2-l2a` collection. This establishes a discoverable global source, not coverage for any chosen parcel/date. Exact acquisitions over an identified parcel have not been searched or verified. Sentinel Hub process requests use OAuth2 credentials ([authentication documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html)); no project account/client credentials are configured, and no separate Sentinel-2 imagery was acquired.

Status remains `DISCOVERED` for this source. Dataset listing/catalog discovery is not evidence that the target time series can be retrieved or that a specific parcel has usable observations.
| ESA WorldCover | Land-cover context | PLANNED | Product-year differences can reflect product methods as well as land change. |
| WorldPop | Population context | PLANNED | Population is not a direct measure of water use or groundwater extraction. |
| ABHT groundwater information | Possible secondary groundwater context | PLANNED | Relevant well measurements, locations, dates, and access remain unverified. |

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

The Figshare source files were downloaded only for the inspection described above; no supplied series was joined to parcel geometry, no raster was processed, and no result was scientifically validated. Sentinel-2 product observations were not acquired. Before integrating either source, record the intended parcel(s), time range, purpose, expected output, join key, product metadata, quality method, and reuse attribution requirements.
