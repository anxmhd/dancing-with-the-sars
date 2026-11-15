# Backend

FastAPI application for the first project workflow: retrieving one agricultural
parcel's seasonal Sentinel-2 NDVI observations.

**Status:** application foundation implemented and software-tested against a
synthetic provider. No real satellite data, scientific processing, or
scientifically validated result exists in this repository. The committed
OpenAPI document is proposed for team review; it is not frozen.

## Layout

```text
src/dancing_with_sars/
  main.py            Application factory, startup wiring
  config.py          Settings resolved from the environment
  domain/            Framework-independent shared values
  application/       Ports, orchestration, validation, typed errors
    science_contract.py   Application-to-science interface (Developer 3 boundary)
    service.py            Request validation and science orchestration
    result_validation.py  Contract invariants for scientific results
    mock_science.py       Deterministic synthetic science provider
    mock_parcels.py       Synthetic parcel references (placeholder geometry)
  api/               HTTP routes, schemas, serialization, error handling
tests/               Pytest integration and contract tests
```

The API/application layers depend on the protocols in
`application/science_contract.py`; they never import provider rasters, download
code, or scientific algorithms. `docs/DATA_CONTRACTS.md` remains the semantic
contract; `docs/api/openapi.yaml` is the single machine-readable HTTP artifact.

## Endpoints

Both endpoints are under `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness, service version, and the configured science provider. |
| `GET` | `/parcels/{parcelId}/vegetation-series?startDate=&endDate=&index=` | Candidate NDVI observations for one parcel and inclusive date range. |

`index` currently accepts only `NDVI`. Dates use `YYYY-MM-DD`. The response
follows the camelCase contract in `docs/DATA_CONTRACTS.md`.

Empty states are successful `200` responses:

- `noObservations`: no candidate acquisition exists in the range.
- `noValidObservations`: candidates exist, but none was accepted.

Missing acquisitions are absent from `observations`. Excluded or unassessed
candidates remain present with `value: null` and their quality state. A missing
value is never rendered as zero.

### Error envelope

Every failure returns the documented envelope:

```json
{
  "code": "INVALID_DATE_RANGE",
  "message": "The end date must not precede the start date.",
  "details": [
    {"fieldPath": "endDate", "code": "DATE_ORDER", "message": "End date precedes start date."}
  ]
}
```

| Code | HTTP | Meaning |
|---|---:|---|
| `INVALID_REQUEST` | 422 | Missing, malformed, or otherwise invalid request parameter. |
| `INVALID_DATE_RANGE` | 422 | `endDate` precedes `startDate`. |
| `UNSUPPORTED_INDEX` | 422 | Index other than `NDVI`. |
| `PARCEL_NOT_FOUND` | 404 | Unknown internal parcel identifier. |
| `SOURCE_UNAVAILABLE` | 503 | Scientific data source could not be reached. |
| `PROCESSING_FAILED` | 500 | Science processing failed or returned a contract-invalid result. |
| `INTERNAL_ERROR` | 500 | Unexpected backend failure (safe message, no internals). |
| `NOT_FOUND` / `METHOD_NOT_ALLOWED` | 404 / 405 | Unknown route or method. |

## Mock scientific provider

`DWS_SCIENCE_PROVIDER` defaults to `mock`. The mock provider performs no
satellite access or scientific calculation. All identifiers, dates, values, and
provenance it returns are synthetic. It supports three documented scenarios:

| Parcel ID | Result |
|---|---|
| `synthetic-parcel-001` | Accepted observations on 2025-01-15 and 2025-02-15, one excluded on 2025-03-15. |
| `synthetic-parcel-002` | No observations. |
| `synthetic-parcel-003` | Candidates exist, all excluded or unknown (no valid observations). |

Other parcel IDs are unknown and return `PARCEL_NOT_FOUND`. Provenance reports
`Synthetic source (mock science provider)` and
`Synthetic dataset (not satellite data)`; it deliberately supplies no external
dataset, product, or acquisition identifiers.

The mock is an adapter behind `VegetationScienceGateway`, not an API concern.
Replacing it means adding the real provider in `application/providers.py`; no
route, schema, or service code needs to change.

## Run

From `backend/`:

```powershell
uv sync
uv run uvicorn --factory dancing_with_sars.main:create_app --reload
```

Then open:

- API documentation: <http://127.0.0.1:8000/api/v1/docs>
- Health: <http://127.0.0.1:8000/api/v1/health>
- OpenAPI JSON: <http://127.0.0.1:8000/api/v1/openapi.json>

Example request:

```powershell
curl "http://127.0.0.1:8000/api/v1/parcels/synthetic-parcel-001/vegetation-series?startDate=2025-01-01&endDate=2025-03-31&index=NDVI"
```

## Test and check

From `backend/`:

```powershell
uv sync
uv run pytest
uv run ruff check .
```

Tests use synthetic fixtures only and require no external services. The contract
test compares the application's generated OpenAPI document with the committed
`docs/api/openapi.yaml` and the shared fixture at
`../tests/fixtures/vegetation-series.synthetic.json`.

Regenerate the OpenAPI document after changing routes or schemas:

```powershell
uv run python -m dancing_with_sars.api.openapi_export
```

## Limitations and open integration questions

- No real parcel geometry, CRS, satellite product, acquisition, or NDVI value is
  available. The synthetic parcel catalog uses explicit placeholder geometry that
  is never serialized by the API.
- The OpenAPI document, error-code mapping, and endpoint path need review by the
  frontend and scientific owners before being frozen.
- Parcel selection currently relies on an internal ID already known to the
  caller. A parcel collection endpoint is deliberately not implemented; it
  depends on an approved parcel source.
- Tests verify software behavior and contract shape, not scientific validity.
