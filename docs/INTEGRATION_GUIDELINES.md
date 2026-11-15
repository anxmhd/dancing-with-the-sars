# Integration guidelines

## Contract authority and merge order

[`contracts/multisensor-response.schema.json`](../contracts/multisensor-response.schema.json) is the canonical public response schema. [`contracts/api-error.schema.json`](../contracts/api-error.schema.json) defines API errors. The fixtures under `contracts/fixtures/` are shared examples. Scientific CLI artifacts under `data/results/` are processing outputs and must be explicitly mapped by the backend serializer; they are not wire payloads.

Implementation order for parallel work:

1. Backend owns the HTTP request/response layer and implements the documented serializer against the schema. Scientific owner reviews measurement meaning, lineage, and quality semantics.
2. Frontend consumes the same schema/fixtures and implements presentation, states, and API client. It does not derive or recalculate scientific values.
3. Backend and frontend independently validate against the shared fixtures; changes to schema or fixture shape are coordinated with all three owners before coding against them.
4. Merge backend API/serializer before frontend live API integration. Frontend may build against shared fixtures in parallel. Do not merge conflicting edits to the schema, fixtures, or this document without contract-owner review.

One implementation owner per file set: frontend owns `frontend/`; backend owns future backend API/application modules and the response serializer; scientific processing owner owns `backend/src/dancing_with_sars/{data_access,science}/`; contract editor owns `contracts/`, shared fixtures, validator, and contract documentation in consultation with all owners. A reviewer must not silently change another owner's measurement semantics.

## Proposed API surface (documentation only)

There is no API implementation yet. The minimum useful synchronous surface is:

| Method/path | Purpose | Success | Errors |
|---|---|---|---|
| `GET /api/v1/parcels/{parcelId}` | Return one parcel as a GeoJSON `Feature` in WGS 84, for map selection/context. | `200` with source-backed feature. | `404` unknown parcel; `500` unexpected server error. |
| `GET /api/v1/parcels/{parcelId}/observations?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&missions=Sentinel-2&missions=Sentinel-1&missions=NISAR` | Return observations for a parcel and inclusive date window for requested missions. Repeat `missions` for multiple sensors. | `200` with the canonical multisensor response, including one `sensorResults` state per requested mission. | `400` invalid date/order/mission; `404` unknown parcel; `500` unexpected error. |

This is a proposed interface for the first handoff, not an implemented route or a requirement to add a framework module before implementation. A sensor source that was successfully searched with no matching acquisition reports `noObservations`; candidate acquisitions with no accepted measurements report `noValidObservations`; a source that could not be queried/read reports `unavailable`. Partial success remains HTTP 200 and exposes each sensor's state. Request-level invalidity, unknown parcel, and unexpected application failures use the error schema. Do not turn source unavailability into an empty/no-observation state.

The first API release must only report coverage from data the backend can actually query or from approved, indexed results. Current processing scripts handle explicit products/local files; they do not provide general catalog search. Do not claim arbitrary historical coverage until source discovery, credentials, quotas, and access policy are implemented. No source download, long-running job system, database, or comparison endpoint is included in this minimum interface.

## Frontend responsibilities

- Consume GeoJSON and the canonical response; keep TypeScript types derived from or checked against the JSON Schema.
- Show per-sensor acquisition/availability state and keep observation-level exclusions visible.
- Render a map, timeline/chart, measurement value/statistic/unit, acquisition date, sensor/channel, coverage/quality, provenance, and interpretation limits from returned fields.
- Distinguish loading, valid empty (`noObservations`), all candidates excluded (`noValidObservations`), partial/unavailable sensor, request error, and unknown parcel.
- Do not treat null as zero; do not visually imply that Sentinel-1, Sentinel-2, and NISAR measures share a common scale.
- Use fixture values for development; label fixtures/demo context where users could mistake them for live observations.

## Backend responsibilities

- Validate path and query input; enforce inclusive valid date ranges and requested mission enumeration.
- Resolve parcel geometry from approved source-backed data, orchestrate the scientific public interface, and serialize explicitly into the canonical schema.
- Preserve exact source/catalog/product/mirror identifiers separately, acquisition timestamp, platform/instrument and sensor metadata, units/representation/statistic, grids, per-measurement quality/coverage, processing lineage, and limitations.
- Return one status for every requested mission; do not erase partial availability or excluded acquisitions.
- Map domain/source failures to the documented error and sensor-status semantics. Do not duplicate scientific calculations in HTTP code.
- Validate serialized payloads against the schema in tests/CI. Never expose local paths, credentials, or raw asset access tokens.

## Scientific owner responsibilities

- Keep each sensor/product reader independent and map source metadata without assuming another sensor's semantics.
- Supply values and processing metadata as recorded by the scientific pipeline; resolve uncertainty in data access with explicit unknowns/limitations, not serializer guesses.
- Preserve source QA and report derived acceptance separately. No API status can imply independent scientific validation.
- Review the actual query source coverage and ability to distinguish `noObservations` from `unavailable` before the endpoint is described as supporting a date range.

## Validation and merge gate

Before merging cross-boundary work, run `uv run --locked python scripts/validate_contract.py`, backend Pytest/Ruff, frontend typecheck/tests/build, and relevant API integration checks. Review all five shared response scenarios (available S1/S2, NISAR excluded, partial availability, no observations, unavailable source). Inspect at least one serialized response for lineage and scientific limitations. Unit/schema tests prove shape and software behavior, not measurement validity. External source access is not required in CI.
