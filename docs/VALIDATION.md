# Testing and validation

## Foundation checks

The code has a frontend identity shell, Python package foundation, a provisional per-acquisition NDVI processor, Sentinel-2 and Sentinel-1 RTC product readers, and a NISAR GCOV HDF5 reader tested against an actual local product. Deterministic tests use synthetic raster/HDF5 fixtures for reader windows, units, nodata, masks, and parcel summaries; they verify software behavior only. The actual NISAR product was read and summarized, but its source focus masks reject every selected-parcel candidate, so there is no accepted numeric parcel value. Software tests and successful file reading do not establish scientific validation; see [the product report](NISAR_GCOV_PRODUCT_VALIDATION.md).

Run checks as described in [the README](../README.md). CI runs Python tests, linting, and the JSON Schema/fixture validator, plus frontend type checking, tests, and a production build.

## Future software testing

Use deterministic, small fixtures. Add unit, integration, API-contract, and end-to-end tests when the corresponding modules and workflows exist. Cover ordinary and edge cases, invalid inputs, missing/empty data, CRS handling, temporal alignment, and error paths where relevant. Tests must not require unpredictable external services or large satellite archives.

## Scientific validation

The supplied Figshare parcel and NDVI archives were inspected for file structure and metadata, not integrated into the application. The initial real-data outputs in [the result report](FIRST_REAL_MULTISENSOR_RESULT.md) have not been compared with an independent implementation or field measurements. Before marking either method scientifically validated, review the provisional product-specific QA/aggregation choices, compare parcel masks and values against an independent trusted reference with stated tolerances, and obtain relevant field evidence. Do not use the supplied NDVI CSVs as ground truth until their provenance and repeated same-date records are resolved.

For each result, retain the exact source/product and acquisition, product metadata, units/scaling, spatial and temporal resolution, preprocessing/quality rules, provenance, missingness, uncertainty, and limitations. Report interpretation separately from measured/derived values. Synthetic tests and agreement between datasets do not by themselves establish scientific validity. Do not imply stress, irrigation, drought effects, or groundwater conditions from NDVI alone; do not equate SAR backscatter with soil moisture or stress. For Sentinel-1/NISAR comparisons, justify compatibility across frequency, polarization, acquisition geometry/date, resolution, processing level, and quantity before calculating comparative statistics. Otherwise, report the observations separately and state their limits.

Track software state separately: `IMPLEMENTED`, `TESTED`, and `VALIDATED` mean different things. A passing software suite alone does not validate scientific methods or findings.
