# Dataset catalog and roadmap

The entries below are candidate sources from the project constitution. Every entry starts as `PLANNED`; none has been accessed, acquired, inspected, processed, or validated in this repository.

| Dataset | Intended role | Status | Important limit to verify |
|---|---|---|---|
| Sentinel-1 | Historical C-band radar observations | PLANNED | Product type, coverage, geometry, and suitability depend on task and period. |
| NISAR | Complementary L-band observations | PLANNED | Actual product availability, maturity, coverage, and product type must be checked. |
| Sentinel-2 | Optical vegetation indicators such as NDVI/NDMI | PLANNED | Surface-reflectance product, cloud conditions, and coverage need inspection. |
| CHIRPS | Regional rainfall context | PLANNED | Coarse resolution; not parcel-level rainfall. |
| ERA5-Land | Reanalysis climate and land-surface context | PLANNED | Model-based estimates at coarse resolution, not parcel measurements. |
| Moroccan agricultural ground truth | Parcel/crop/irrigation reference information | PLANNED | Files, dates, attributes, coverage, CRS, license, and quality remain unverified. |
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

No external data has been downloaded or processed for this foundation. A later task must identify the exact source/product, geography, dates, purpose, and expected output before acquisition work begins.
