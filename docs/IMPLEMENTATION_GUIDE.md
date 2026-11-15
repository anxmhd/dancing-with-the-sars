# Multisensor implementation handoff

## Contract and source-of-truth files

- Public observation response: [`contracts/multisensor-response.schema.json`](../contracts/multisensor-response.schema.json), JSON Schema Draft 2020-12, version `1.0`.
- Public request/application error envelope: [`contracts/api-error.schema.json`](../contracts/api-error.schema.json).
- Cross-language examples: [`contracts/fixtures/`](../contracts/fixtures/README.md).
- Automated schema and invariant checker: [`scripts/validate_contract.py`](../scripts/validate_contract.py).
- Scientific CLI evidence: `data/results/sentinel2_el_haouz_Trees_20240110_036_20261101.json`, `data/results/sentinel1_el_haouz_Trees_20240110_036_20261026.json`, and `data/results/nisar_gcov_el_haouz_Trees_20240110_036_20261106.json`.

CLI artifacts and HTTP responses have different responsibilities. Backend serialization maps the scientific results into the schema; it must not change scientific calculations or interpret unknown metadata.

## Agreed response behavior

An observation represents one parcel and one acquisition, with multiple distinct measurements where the product supports them. `sensorResults` has exactly one row for each requested mission, even if that mission returns no observation. Status meanings:

| Status | Use when |
|---|---|
| `available` | At least one returned measurement has a numeric value and passed its declared software quality policy. |
| `noObservations` | The requested source was successfully searched for the requested area/date window and returned no candidate acquisitions. |
| `noValidObservations` | Candidate acquisitions exist, but no measurement is accepted; retain those observations and their null values/reasons. |
| `unavailable` | Requested source could not be queried/read or coverage could not be established. Do not pretend the search succeeded. |

Partial sensor outcomes are valid in one HTTP 200 response. The status values describe retrieval and declared software checks; none means the scientific method is independently validated.

## Proposed minimal endpoints

API implementation is not present. The proposed v1 routes are:

- `GET /api/v1/parcels/{parcelId}` → source-backed GeoJSON Feature (WGS 84).
- `GET /api/v1/parcels/{parcelId}/observations` with inclusive `startDate`, `endDate`, and repeatable `missions` query parameters → the canonical response.

Suggested HTTP outcomes: 200 for a valid query including partial/no-data states; 400 for invalid query parameters; 404 for unknown parcel; 500 for unexpected failures. Use `api-error.schema.json` for request-level errors. Before promising broad time-range support, backend must establish an actual indexed/catalog acquisition lookup; current scientific CLIs process explicit product identifiers/local products and do not supply general catalog discovery. The selected El Haouz parcel geometry is source-backed; a definitive Haouz regional boundary has not been established. The first map may show a basemap and source-backed parcel overlay, but must not draw an invented study-area outline or imply regional data coverage.

Do not add ingestion jobs, new providers, a database, arbitrary product download, a sensor comparison API, or unsupported stress/crop classifications as part of this first integration.

## Ownership and task split

| Owner | Files/work | Acceptance |
|---|---|---|
| Contract editor (shared, assigned by team) | `contracts/*.schema.json`, `contracts/fixtures/`, `scripts/validate_contract.py`, contract docs | All fixtures and negative cases pass; cross-team review for shape changes. |
| Backend developer | Future API/router, request validation, serializer and API tests in backend-owned application files | Serializer output validates against shared schema; errors and per-sensor statuses match the semantics above; no science logic duplication. |
| Scientific developer | Existing `backend/src/dancing_with_sars/data_access/` and `science/` only when scientific corrections are authorized | Product evidence and methods remain in scientific result objects; unknown metadata stays explicit; no API import. |
| Frontend developer | `frontend/` types/API client/map/measurement presentation and UI tests | Uses schema/fixtures; shows quality, source, date, units, partial/unavailable/empty/error states; does not recalculate. |
| All owners | Review contract changes; verify integration | Review measurement semantics, consumer use, backward compatibility, and evidence. |

Recommended sequence: (1) team assigns one contract editor and reviews v1 schema; (2) backend implements serializer and route against shared fixtures; (3) frontend builds against fixtures in parallel, then connects after the serializer is available; (4) run the merge gate together. Backend can begin serializer/API scaffolding without altering scientific processing. If the backend has a framework/layout already on its branch, fit implementation there rather than assuming new package names. No API/frontend code currently exists in this checkout.

## Branch synchronization

The current workspace exposes local `main` and `feature/scientific-foundation`; it does not expose separate backend or frontend implementation branches. These contract changes are currently local and uncommitted by task constraint. Backend/frontend developers must receive the schema, fixtures, validator, and handoff through the team's normal reviewed branch-sharing workflow before treating them as available. Their implementation branches should synchronize to the contract version before parallel payload work; do not independently implement the superseded NDVI-only response shape. No remote branch was modified or published here.

## Scientific meanings retained

- Sentinel-2 NDVI: the reported derived index, not proof of stress, crop health, irrigation, drought effect, or groundwater status.
- Sentinel-1: VV/VH C-band gamma-zero stored linear power. The product STAC omits unit/scale/offset; the adapter's declared `1` unit remains qualified with `unitStatus` and an explicit limitation.
- NISAR: four inspected diagonal GCOV records (A/B × HH/HV); the source masks reject all current parcel candidate pixels. Keep values null and A/B grids/frequencies distinct. Do not infer a parcel value or directly compare with C-band.
- Product source ID, catalog item ID, and mirror/asset ID are separate. Missing catalog transfer provenance remains null/qualified.

No NISAR semantic beyond the actual inspected product is verified. The schema's NISAR branch covers only observed L-band product fields and must be extended from actual evidence before adding other product quantities/channels.

## Developer commands

From repository root:

```powershell
cd backend
uv sync --locked --dev
uv run --locked python ../scripts/validate_contract.py
uv run --locked pytest
uv run --locked ruff check .
```

From a separate terminal:

```powershell
cd frontend
npm ci
npm run check
npm run build
```

CI runs schema validation after backend tests and lint. Contract-only check requires `jsonschema` in backend dev dependencies and lockfile.
