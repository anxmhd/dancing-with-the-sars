# Testing and validation

## Foundation checks

The current code has only a frontend identity shell and a Python package version marker. Automated checks verify that these minimal entry points load and render. They do not validate remote sensing methods or scientific conclusions.

Run checks as described in [the README](../README.md). CI runs Python tests and linting plus frontend type checking, tests, and a production build.

## Future software testing

Use deterministic, small fixtures. Add unit, integration, API-contract, and end-to-end tests when the corresponding modules and workflows exist. Cover ordinary and edge cases, invalid inputs, missing/empty data, CRS handling, temporal alignment, and error paths where relevant. Tests must not require unpredictable external services or large satellite archives.

## Scientific validation

For each approved method, define domain-specific acceptance criteria before claiming validation. Examples include known-value checks for indices and unit conversions; CRS and spatial-intersection checks; nodata/cloud-mask behavior; temporal aggregation; and comparison against independent reference information where available.

Track software state separately: `IMPLEMENTED`, `TESTED`, and `VALIDATED` mean different things. A passing software suite alone does not validate scientific methods or findings.
