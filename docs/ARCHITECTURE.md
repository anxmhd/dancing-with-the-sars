# Architecture

## Current implementation

The repository is a monorepo with a minimal React/TypeScript frontend and a minimal Python package. It does not yet contain an API, dataset access, geospatial processing, or feature modules.

## Boundaries

| Area | Owns | Depends on | Must not own |
|---|---|---|---|
| `frontend/` | Browser rendering and interaction | Explicit API/data contracts when introduced | Satellite archive access or scientific calculations |
| `backend/src/dancing_with_sars/` | Python application package; future API and domain integration | Domain/scientific interfaces | Browser presentation |
| Future API module | HTTP request/response validation and orchestration | Domain interfaces and prepared outputs | Frontend code or undocumented processing |
| Future domain module | Stable project concepts and contracts | Standard Python types | HTTP framework, provider-specific access, or UI |
| Future science module | Reproducible calculations and geospatial methods | Explicit inputs and focused scientific libraries | HTTP and UI frameworks |
| Future data module | Source metadata, acquisition adapters, and data validation | Approved sources and formats | Presentation and scientific interpretation |

The future modules are architectural boundaries, not directories created in advance. Add them when an approved task gives them real responsibilities. Keep dependencies one-way: API/application orchestration may call domain and science interfaces; science must not depend on API or frontend. Data access stays separate from scientific transformation.

## Data flow

Approved source → acquisition → inspection and validation → documented processing → traceable derived output → API/interface → frontend visualization. Raw archives, intermediate files, and derived products remain distinct. Large source data does not belong in Git or in browser downloads.

## API direction

FastAPI is the selected framework when a concrete API is needed. Use validated request/response models and generated OpenAPI contracts. Define a purpose and tests for each endpoint before implementation; do not add placeholder routes. No API runtime dependency or endpoint exists in this foundation.

## Frontend direction

React, TypeScript strict mode, and Vite form the frontend foundation. Leaflet is the planned first map library when a verified boundary or layer is ready. Keep chart and map dependencies deferred until their use is approved.

## Dependency policy

Use the smallest dependencies that support an approved task. Pin resolved versions in lockfiles. Avoid PostGIS, cloud services, distributed processing, and machine-learning infrastructure until requirements justify them.
