# Backend

FastAPI application for Dancing with the SARs: parcel discovery and
multisensor observations (Sentinel-2, Sentinel-1, NISAR).

**Status:** backend API implemented and software-tested against the shared
multisensor contract and fixtures. Parcel geometry comes from
`backend/examples/el_haouz_parcel.geojson`; observations are sourced from the
shared fixtures and contract. The committed OpenAPI document is generated from
the application.

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

All endpoints are under `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness and service version. |
| `GET` | `/parcels/{parcelId}` | Source-backed parcel as a GeoJSON Feature. |
| `GET` | `/parcels/{parcelId}/observations?startDate=&endDate=&missions=` | Canonical multisensor response. |

`missions` is repeatable and accepts `Sentinel-2`, `Sentinel-1`, `NISAR`
(defaults to all three). Dates use `YYYY-MM-DD`. The response follows
`contracts/multisensor-response.schema.json`.

Sensor statuses: `available`, `noObservations`, `noValidObservations`,
`unavailable`. NISAR rejected pixels remain `null`.

### Error envelope

Every failure returns:

```json
{ "error": { "code": "invalidRequest|parcelNotFound|internalError", "message": "...", "requestId": null } }
```

| Code | HTTP | Meaning |
|---|---:|---|
| `invalidRequest` | 400 | Missing, malformed, or otherwise invalid request. |
| `parcelNotFound` | 404 | Unknown parcel identifier. |
| `internalError` | 500 | Unexpected backend failure. |

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
curl "http://127.0.0.1:8000/api/v1/parcels/el%20haouz_Trees_20240110_036/observations?startDate=2026-10-01&endDate=2026-11-30&missions=Sentinel-1&missions=Sentinel-2"
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
`docs/api/openapi.yaml`.

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
