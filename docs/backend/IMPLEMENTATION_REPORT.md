# Backend foundation — implementation report

- Date: 2026-11-14
- Branch: `feature/backend-api-foundation`
- Owner: Backend/application (Developer 2)
- Status: implemented and software-tested; **not** scientifically validated

## Scope delivered

1. FastAPI application foundation with startup wiring and configuration.
2. Proposed OpenAPI document for the first workflow:
   `docs/api/openapi.yaml`.
3. Application-to-science interface defined as Python protocols and typed
   values in `backend/src/dancing_with_sars/application/science_contract.py`.
4. Deterministic synthetic scientific provider and parcel catalog.
5. Orchestration for "retrieve a parcel's seasonal NDVI observations".
6. Request validation, contract-invariant checks, and one API error envelope.
7. Backend tests, shared synthetic response fixture, Ruff and Pytest checks.
8. Backend run/test documentation in `backend/README.md`.
9. This report with assumptions and integration dependencies.

## HTTP surface

- `GET /api/v1/health`
- `GET /api/v1/parcels/{parcelId}/vegetation-series?startDate=&endDate=&index=`

No other endpoints were added. Path/query names, response shape, and error
envelope derive from `docs/DATA_CONTRACTS.md`. The OpenAPI document is generated
from the application and committed; a test fails if the two disagree.

## Architecture and dependency direction

```text
api/ (FastAPI)  ->  application/ (ports, service, validation, mocks)  ->  domain/
                          |
                          +-> science_contract protocols implemented by
                              the mock today and by the science package later
```

- The application layer has no FastAPI imports and raises typed,
  framework-independent errors.
- The API maps those errors to HTTP status codes and the camelCase envelope.
- The science boundary never receives HTTP schemas; it receives the domain
  request with parcel geometry/CRS, inclusive dates, and the NDVI enum.
- Serialization is explicit in `api/serialization.py`; no science or provider
  object is returned directly.
- Nothing in the backend calculates NDVI, applies cloud masks, or aggregates
  raster pixels.

## Mock provider

`DWS_SCIENCE_PROVIDER=mock` (default) wires `MockScienceGateway` and
`SyntheticParcelCatalog`. Behavior is deterministic and documented in
`backend/README.md`. Results identify themselves as synthetic in `provider`,
`datasetName`, `processingSoftware`, `processingMethod`, and every synthetic ID.
No external dataset, product, acquisition ID, acquisition time, pixel count, or
processing timestamp is invented; those fields are `null`.

## Error and data-integrity behavior

| Situation | Response |
|---|---|
| Malformed/missing parameter | 422 `INVALID_REQUEST` with field details |
| Reversed range | 422 `INVALID_DATE_RANGE` (`DATE_ORDER`, `endDate`) |
| Index other than NDVI | 422 `UNSUPPORTED_INDEX` |
| Unknown parcel | 404 `PARCEL_NOT_FOUND` |
| No acquisitions in range | 200 `noObservations`, empty array |
| Candidates but none accepted | 200 `noValidObservations`, `value: null` per item |
| Source unavailable | 503 `SOURCE_UNAVAILABLE` |
| Processing failure / contract-invalid science output | 500 `PROCESSING_FAILED` |
| Unexpected backend error | 500 `INTERNAL_ERROR`, no internals leaked |

The application rejects accepted observations without a finite value,
non-accepted observations carrying a value, out-of-range observation dates,
duplicate observation IDs, negative or inconsistent pixel counts, missing
provenance, and a `resultStatus` inconsistent with the observations. It never
coerces missing values to zero or drops excluded candidates.

## Verification actually run

Environment: Windows, Python 3.13.18 via uv 0.13.8, Git Bash.

From `backend/`:

- `uv sync --locked` — passed (26 packages checked).
- `uv run --locked pytest` — **38 passed**.
- `uv run --locked ruff check .` — **All checks passed**.
- `uv run python -m dancing_with_sars.api.openapi_export` — regenerated
  `docs/api/openapi.yaml`; the contract test confirms it matches the app.

Pytest reports one third-party deprecation warning from Starlette's TestClient
about `httpx`; it does not affect results.

These checks establish software and contract-shape behavior only. They do not
establish scientific validity.

## Assumptions

1. One authoritative HTTP contract is OpenAPI, generated from the backend and
   committed at `docs/api/openapi.yaml`; the frontend should derive types from
   it rather than maintain a parallel copy.
2. The endpoint path is `GET /api/v1/parcels/{parcelId}/vegetation-series`;
   `docs/DATA_CONTRACTS.md` deliberately left routes undecided.
3. `index` is a query string accepting only `NDVI`; unsupported values produce
   `UNSUPPORTED_INDEX` rather than a generic validation error.
4. Health/status is a backend concern and is not part of the scientific
   contract; `scienceProvider` is included so consumers can see mock mode.
5. Parcel reference data (geometry and declared CRS) is resolved before the
   science call. Real resolution depends on an approved parcel source and is
   represented today by an explicitly synthetic catalog with placeholder
   geometry and CRS `synthetic-crs`; geometry is never exposed by the API.
6. A science provider signals an unavailable source with
   `ScienceSourceUnavailableError` and a processing failure with
   `ScienceProcessingError`; the backend maps both without reimplementing
   processing.

## Integration dependencies

### Developer 1 (frontend)

- Review the proposed OpenAPI document: path, parameter names, camelCase
  response fields, result-status values, and error envelope.
- Confirm the frontend can render `available`, `noObservations`, and
  `noValidObservations` distinctly, and that `value: null` for excluded
  observations is acceptable.
- Use `tests/fixtures/vegetation-series.synthetic.json` as the shared synthetic
  response fixture; do not create a second backend copy.
- Generated client types should come from `docs/api/openapi.yaml`.

### Developer 3 (science)

- Confirm the `ScienceRequest` fields (including parcel geometry/CRS) and the
  `VegetationSeriesResult` / `DataProvenance` / `DataQuality` shapes can be
  produced, and that the named exceptions are the right failure signal.
- Confirm which fields will be unknown (`null`) until real products are
  inspected, especially acquisition time, pixel counts, external identifiers,
  product version, and `processedAt`.
- Provide a real `VegetationScienceGateway` implementation to register in
  `application/providers.py`; it must not import FastAPI or API schemas.
- Real parcel geometry/CRS resolution and product assumptions remain pending
  source approval.

## Open questions / not implemented

- Endpoint path and OpenAPI are **proposed**, not reviewed or frozen.
- No parcel collection endpoint; parcel selection assumes an internal ID already
  known to the caller.
- No CORS configuration, authentication, persistence, caching, or deployment.
- No real parcel boundary, product, acquisition, quality policy, aggregation
  statistic, or NDVI value.
- No frontend integration or browser/end-to-end test was performed.
