# Project status

Last updated: 2026-11-14

## Established

- Project foundation, development rules, scientific safeguards, React/TypeScript shell, Python package, CI, and locked dependencies.
- Provisional Sentinel-2 L2A NDVI workflow and one real El Haouz parcel result.
- Sentinel-1 RTC workflow and one real El Haouz VV/VH gamma-zero result, with distinct mean/median values and explicit source unit caveat.
- NISAR GCOV reader inspected against an actual locally supplied HDF5 product; four diagonal frequency/polarization candidate records are produced with source lineage, grids, masks, and quality counts. All parcel candidates fail source focus validity; values remain null.
- Authoritative JSON Schema Draft 2020-12 v1.0 observation and error contracts, five shared fixtures, cross-field validator, and API/frontend integration handoff.
- Contract validation passed locally: both schemas valid, all five fixtures accepted, source artifact values checked, and nine invalid-payload cases rejected.
- Raw satellite products and other large data remain excluded from Git.

## Not established

- No API routes, backend response serializer, database, or interactive map/results workflow exists yet.
- No accepted NISAR value exists for the selected parcel. There is no Sentinel-1/NISAR numeric comparison.
- No multi-acquisition time series, climate workflow, independent reference validation, or field validation exists.
- Sentinel-2 SCL exclusion/statistic/coverage choices remain explicit provisional demo policy; S1 unit/scale/offset are omitted by source STAC; exact NISAR catalog URL/transfer record was not retained.
- Figshare's historical 2023–2025 survey labels do not validate 2026 satellite observations; its supplied NDVI CSVs are not integrated.

## Verification status

Contract-only validation passed: both schemas are valid, all five fixtures are accepted, S1/S2/NISAR fixture evidence matches the scientific artifacts, and nine invalid payloads are rejected. Backend Pytest passed (22 tests), Ruff passed, frontend typecheck/Vitest passed (1 test), Vite build passed, and `git diff --check` passed. Raw NISAR source remains ignored. Contract validity demonstrates structural compatibility only. Reader/software tests, product reading, and internal consistency do not establish independent scientific validity.

## Next step

Backend and frontend developers can implement against the frozen schema and fixtures, following [the implementation handoff](IMPLEMENTATION_GUIDE.md). Backend should implement the parcel lookup/observation serializer and API behavior first; frontend can build against fixtures in parallel and connect after the serializer is available. Do not add an S1/NISAR comparison or interpret NDVI as stress without additional evidence and an approved method.
