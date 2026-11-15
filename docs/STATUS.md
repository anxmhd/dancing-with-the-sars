# Project status

Last updated: 2026-11-15

## Established

- Project foundation, development rules, scientific safeguards, React/TypeScript shell, Python package, CI, and locked dependencies.
- Read-only FastAPI API with parcel GeoJSON and multisensor observation endpoints, plus a React/Leaflet map and results UI against the canonical v1.0 schema.
- Provisional Sentinel-2 L2A NDVI workflow with 11 real El Haouz parcel acquisitions (June–November 2026), including excluded-quality cases.
- Sentinel-1 RTC workflow with 10 real El Haouz VV/VH gamma-zero acquisitions (June–October 2026), same descending orbit, with distinct mean/median values and explicit source unit caveat.
- NISAR GCOV reader inspected against an actual locally supplied HDF5 product; four diagonal frequency/polarization candidate records are produced with source lineage, grids, masks, and quality counts. The original parcel fails source focus validity; three other El Haouz parcels pass the unchanged policy with 100% valid candidate pixels for the 2026-11-06 granule.
- NISAR-guided multisensor campaign for those three parcels: 3 NISAR observations (2026-11-06), 23 Sentinel-1 RTC observations and 23 Sentinel-2 L2A observations (20 accepted, 3 SCL-excluded), matched to the real NISAR dates across 2026-08-14 to 2026-11-06. Seven further NISAR granules are catalogued but cannot be downloaded without Earthdata Login credentials. See [the campaign report](MULTISENSOR_CAMPAIGN_2026.md).
- Authoritative JSON Schema Draft 2020-12 v1.0 observation and error contracts, five shared fixtures, cross-field validator, and API/frontend integration handoff.
- Contract validation passed locally: both schemas valid, all five fixtures accepted, source artifact values checked, and nine invalid-payload cases rejected.
- Raw satellite products and other large data remain excluded from Git.

## Not established

- No repeated NISAR time series exists: only one NISAR acquisition is locally available. There is no Sentinel-1/NISAR numeric comparison.
- No parcel-window pixel artifacts exist for visualization; processors emit parcel summaries only.
- No climate workflow, independent reference validation, or field validation exists.
- Sentinel-2 SCL exclusion/statistic/coverage choices remain explicit provisional demo policy; S1 unit/scale/offset are omitted by source STAC; exact NISAR catalog URL/transfer record was not retained.
- Figshare's historical 2023–2025 survey labels do not validate 2026 satellite observations; its supplied NDVI CSVs are not integrated.

## Verification status

Contract-only validation passed: both schemas are valid, all five fixtures are accepted, S1/S2/NISAR fixture evidence matches the scientific artifacts, and nine invalid payloads are rejected. Backend Pytest passed (22 tests), Ruff passed, frontend typecheck/Vitest passed (1 test), Vite build passed, and `git diff --check` passed. Raw NISAR source remains ignored. Contract validity demonstrates structural compatibility only. Reader/software tests, product reading, and internal consistency do not establish independent scientific validity.

## Next step

Backend and frontend developers can implement against the frozen schema and fixtures, following [the implementation handoff](IMPLEMENTATION_GUIDE.md). Backend should implement the parcel lookup/observation serializer and API behavior first; frontend can build against fixtures in parallel and connect after the serializer is available. Do not add an S1/NISAR comparison or interpret NDVI as stress without additional evidence and an approved method.
