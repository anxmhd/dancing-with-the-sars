# Testing and validation

## Foundation checks

The code has a frontend identity shell, Python package foundation, and a provisional per-acquisition NDVI processor with a series-result assembler. Deterministic tests exercise synthetic raster arrays, SCL alignment/exclusions, nodata, parcel masking/CRS, aggregation, minimum coverage, provenance, and empty/result statuses. They verify software behavior only.

Run checks as described in [the README](../README.md). CI runs Python tests and linting plus frontend type checking, tests, and a production build.

## Future software testing

Use deterministic, small fixtures. Add unit, integration, API-contract, and end-to-end tests when the corresponding modules and workflows exist. Cover ordinary and edge cases, invalid inputs, missing/empty data, CRS handling, temporal alignment, and error paths where relevant. Tests must not require unpredictable external services or large satellite archives.

## Scientific validation

The supplied Figshare parcel and NDVI archives were inspected for file structure and metadata, not integrated or processed by the application. The Sentinel-2 processor has not consumed a real Sentinel-2 scene or been compared with an independent implementation. Before marking it scientifically validated, select a documented product and QA/aggregation policy, obtain an explicitly approved representative product sample, and compare parcel masks and index values against an independent trusted reference with stated tolerances. Also verify any join from provided NDVI CSVs to parcel identifiers before using them as reference values.

Track software state separately: `IMPLEMENTED`, `TESTED`, and `VALIDATED` mean different things. A passing software suite alone does not validate scientific methods or findings.
