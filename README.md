# Dancing with the SARs

Monitoring agricultural dynamics and climate-related vegetation stress in Morocco's Haouz plain through multi-sensor Earth observation.

## Project status

The repository contains the approved development foundation and reproducible command-line workflows that processed one real Sentinel-2 L2A and one Sentinel-1 RTC parcel observation. NISAR GCOV catalog coverage is confirmed and a local HDF5 reader is implemented, but product access currently requires Earthdata authentication. There are no interactive application features or API endpoints, and the initial observations are not scientifically validated. See [the first result report](docs/FIRST_REAL_MULTISENSOR_RESULT.md), [project status](docs/STATUS.md), and [the roadmap](docs/ROADMAP.md).

## Technology

- Frontend: React, TypeScript, Vite, and Vitest.
- Backend/scientific package: Python, NumPy, Rasterio, Shapely, and h5py; managed with uv, with Pytest and Ruff as development tools.
- Mapping library: Leaflet is the initial choice for future study-area and parcel layers. It is not installed until map work is approved.
- API framework: FastAPI is the selected backend direction, deferred until an actual API requirement exists.

The dependency set remains limited to the geospatial and HDF5 libraries used by the implemented workflows. No database or application cloud service is included.

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
```

Frontend terminal:

```powershell
cd frontend
npm ci
npm run dev
```

The frontend currently renders a small project identity shell only. It has no map, data, or analytical features.

## Checks

From `frontend/`, `npm run check` runs TypeScript checking and Vitest; `npm run build` checks the Vite production build. From `backend/`, use the Pytest and Ruff commands above. CI runs these checks on pushes and pull requests to `main`.

## Project guidance

- [Agent instructions](AGENTS.md)
- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Architecture and module boundaries](docs/ARCHITECTURE.md)
- [Domain model](docs/DOMAIN_MODEL.md)
- [First-workflow data contracts](docs/DATA_CONTRACTS.md)
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
