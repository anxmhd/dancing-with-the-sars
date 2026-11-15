# Project status

Last updated: 2026-11-14

## Established

- Project instructions and scientific safeguards in `AGENTS.md`.
- Initial React/TypeScript/Vite frontend shell with a Vitest smoke test.
- Python package metadata, Pytest smoke test, Ruff configuration, and a generated `uv.lock`.
- Architecture, dataset roadmap/status vocabulary, methodology safeguards, validation approach, contribution workflow, and phased roadmap.
- Shared first-workflow domain model, semantic data contracts, module ownership, naming rules, and integration guidelines. These documents do not represent implemented endpoints or verified data.
- Backend API foundation on branch `feature/backend-api-foundation`: FastAPI app, health endpoint, parcel NDVI time-series endpoint, validation, error envelope, and synthetic mock scientific provider.
- Proposed machine-readable HTTP contract at `docs/api/openapi.yaml`, generated from the app and checked for drift by tests. It is not yet reviewed or frozen.
- Shared synthetic response fixture at `tests/fixtures/vegetation-series.synthetic.json`.

## Not established

- No real scientific engine, raster processing, or internal scientific modules; the science boundary is a protocol served by a mock.
- No real parcel boundary/source, satellite product, acquisition, quality policy, or NDVI value. No scientific data acquired, inspected, processed, integrated, or validated.
- No map/chart library installed, database, deployment, or cloud infrastructure.
- No frontend integration with the API; the frontend remains the identity shell.
- The OpenAPI document and API-to-science interface await review by the frontend and scientific owners.

## Verification status

Backend on Python 3.13.18 via uv: `uv sync --locked`, `uv run --locked pytest` (38 passed), and `uv run --locked ruff check .` completed successfully, and the committed OpenAPI document matches the application. The earlier foundation verification also passed frontend `npm ci`, `npm run check`, and `npm run build`; the frontend was not changed by the backend work. These checks exercise software and contract shape only; they are not scientific validation.

## Next step

Review the proposed OpenAPI document and application-to-science interface with the frontend and scientific owners. The endpoint path, error mapping, parcel geometry/CRS source, product coverage, processing level, aggregation method, and quality policy remain unverified or undecided.
