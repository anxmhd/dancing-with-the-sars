# Dancing with the SARs

Monitoring agricultural dynamics and climate-related vegetation stress in Morocco's Haouz plain through multi-sensor Earth observation.

## Project status

The repository contains the approved foundation, a read-only multisensor API, and an interactive map/results UI. It now includes 11 real Sentinel-2 L2A and 10 real Sentinel-1 RTC acquisitions for the source-backed El Haouz parcel, plus one locally supplied NISAR GCOV product whose parcel candidates fail focus masks. NISAR measurements remain null; no numeric parcel value is available. The shared version 1.0 multisensor response schema and fixtures constrain the API and frontend. Software-tested observations are not independently scientifically validated. See [the implementation handoff](docs/IMPLEMENTATION_GUIDE.md), [NISAR product validation](docs/NISAR_GCOV_PRODUCT_VALIDATION.md), [project status](docs/STATUS.md), and [the roadmap](docs/ROADMAP.md).

## Technology

- Frontend: React, TypeScript, Vite, and Vitest.
- Backend/scientific package: Python, NumPy, Rasterio, Shapely, and h5py; managed with uv, with Pytest and Ruff as development tools.
- Mapping library: Leaflet is the initial choice for future study-area and parcel layers. It is not installed until map work is approved.
- API framework: FastAPI is the selected backend direction, deferred until an actual API requirement exists.

The dependency set includes the geospatial/HDF5 libraries used by the scientific workflows and `jsonschema` as a development-only dependency for the shared contract validator. No database or application cloud service is included.

## Prerequisites

- Node.js 22.12 or newer (or a newer supported release) and npm.
- Python 3.11–3.13.
- uv (install using the [official instructions](https://docs.astral.sh/uv/getting-started/installation/)).

## Development setup

Open two terminals from the repository root.

Backend terminal:

```powershell
cd backend
uv sync
uv run pytest
uv run ruff check .
uv run python ../scripts/validate_contract.py
```

Frontend terminal:

```powershell
cd frontend
npm ci
npm run dev
```

The frontend reads the API base URL from `VITE_API_BASE_URL`. Leave it unset for
same-origin/local proxy use, or set it to the deployed API origin without a trailing slash.
The backend allows the two local Vite origins by default. For deployment, set
`CORS_ORIGINS` to a comma-separated list of exact frontend origins, also without trailing
slashes. Do not use a wildcard origin for the public API.

The deployed API must retain access to the repository-level `contracts/` and
`data/results/` directories. On a monorepo host, keep the service root at the repository
root and run the Python build and start commands from `backend/`.

## Checks

From `frontend/`, `npm run check` runs TypeScript checking and Vitest; `npm run build` checks the Vite production build. From `backend/`, use the Pytest and Ruff commands above. CI runs these checks on pushes and pull requests to `main`.

## Project guidance

- [Agent instructions](AGENTS.md)
- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Architecture and module boundaries](docs/ARCHITECTURE.md)
- [Domain model](docs/DOMAIN_MODEL.md)
- [First-workflow data contracts](docs/DATA_CONTRACTS.md)
- [Multisensor implementation handoff](docs/IMPLEMENTATION_GUIDE.md)
- [Team contracts](docs/TEAM_CONTRACTS.md)
- [Integration guidelines](docs/INTEGRATION_GUIDELINES.md)
- [Dataset roadmap and status](docs/DATA_CATALOG.md)
- [Methods and scientific safeguards](docs/METHODOLOGY.md)
- [Scientific processing interface](docs/SCIENCE_PROCESSING.md)
- [Software and scientific validation](docs/VALIDATION.md)
- [Contribution workflow](docs/CONTRIBUTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Current status](docs/STATUS.md)
- [Architecture decisions](docs/decisions/0001-initial-technology-stack.md)
