# Project instructions

## Purpose

Dancing with the SARs is a scientific web application for exploring agricultural dynamics and climate-related vegetation stress in Morocco's Haouz plain. Scientific credibility, reproducibility, and clear communication take priority over speed or decorative complexity.

## Current state

This repository contains the foundation, scientific workflows, actual Sentinel-2, Sentinel-1, and NISAR parcel result artifacts, a real NISAR GCOV reader, and inspected Figshare reference data. The actual NISAR product was read, but product focus masks reject every selected-parcel candidate, so no accepted NISAR value exists. A versioned multisensor JSON Schema, shared fixtures, and validator now define the API response contract. There are no application API routes or interactive analysis features, and the observations are not independently scientifically validated. Read [README.md](README.md), [the architecture](docs/ARCHITECTURE.md), [the domain model](docs/DOMAIN_MODEL.md), [the data contracts](docs/DATA_CONTRACTS.md), [the implementation handoff](docs/IMPLEMENTATION_GUIDE.md), [the team contracts](docs/TEAM_CONTRACTS.md), [the integration guidelines](docs/INTEGRATION_GUIDELINES.md), [the data catalog](docs/DATA_CATALOG.md), [the Figshare join investigation](docs/FIGSHARE_JOIN_INVESTIGATION.md), [the methodology](docs/METHODOLOGY.md), [the validation approach](docs/VALIDATION.md), [the roadmap](docs/ROADMAP.md), [the NISAR product validation](docs/NISAR_GCOV_PRODUCT_VALIDATION.md), and [the status](docs/STATUS.md) before changing the project.

## Scope and data rules

- Work only within the task the user approved. Present a plan and wait when approval is requested.
- Do not download, scrape, process, or integrate scientific data without a task that identifies the source/product, area, dates, purpose, and expected output.
- Record dataset availability and processing status accurately. Downloaded or processed does not mean scientifically validated.
- Preserve the distinction between observation, derived indicator, estimate, association, interpretation, and hypothesis. Never state correlation as causation.
- Do not interpret SAR backscatter as a direct measurement of groundwater depletion. Do not implement forecasting without explicit approval.
- Scientific credibility is non-negotiable, including under schedule pressure. Reduce the number of parcels, acquisitions, indicators, and sensors before reducing processing, validation, or reporting standards.
- For each scientific result, preserve the source dataset and exact product, acquisition date and product metadata, units/scaling, preprocessing and quality policy, spatial/temporal resolution, provenance, missingness, uncertainty, and relevant limitations. Do not invent metadata or hide missing values.
- Distinguish measured observations, derived indicators, estimates, associations, and interpretations. Do not claim that a result is validated when only software correctness, synthetic testing, internal consistency, or comparison has been demonstrated.
- NDVI is an indirect vegetation indicator. NDVI alone is not evidence of vegetation stress, water stress, irrigation, drought impact, crop health, or groundwater conditions. Describe index changes observationally; any stress interpretation requires additional relevant evidence and explicit uncertainty.
- SAR backscatter depends on soil moisture, vegetation structure, surface roughness, polarization, incidence angle, wavelength, acquisition geometry, and processing. Do not present backscatter change as a direct measurement of soil moisture or vegetation stress without a justified method.
- Sentinel-1 C-band and NISAR L-band are complementary, non-interchangeable measurements. Quantitative comparisons must account for wavelength, polarization, date, geometry, resolution, processing level, and measured quantity. If a defensible quantitative comparison is not supported, show observations side by side and explain their complementary information.
- Consult relevant project literature when making methodological or interpretive decisions. Verify that a cited study's area, sensor, product, scale, and research question apply; a citation is not validation unless the cited evidence supports the specific claim.
- Prefer fewer, reproducible, validated outputs over broad feature coverage. Where evidence is insufficient, document what cannot be distinguished and stop short of causal or categorical conclusions.
- Keep raw and large satellite data out of Git. Never commit credentials or local environment files.

## Architecture boundaries

- `frontend/` owns browser presentation and user interaction. It must not process satellite archives or embed scientific calculations.
- `backend/` will own the Python application package. Future API, domain, science, and data-access modules must have explicit responsibilities and one-way dependencies documented before they are introduced.
- The scientific layer must remain independent of HTTP and presentation code. Data access and scientific processing must remain separate.
- Do not add speculative modules, endpoints, databases, cloud services, or dependencies. Add a dependency only for an approved, concrete requirement.
- Keep API contracts explicit and validate inputs and outputs. Do not create placeholder endpoints.
- Treat `contracts/multisensor-response.schema.json` as the canonical public observation response shape and `contracts/api-error.schema.json` as the API error envelope. Scientific CLI artifacts are not API payloads. Keep one authoritative shape rather than independent frontend/backend copies.

## Development conventions

- Use TypeScript strict mode for frontend code and type annotations for Python code.
- Prefer small, focused changes and straightforward implementations. Avoid unrelated refactoring and shared-file collisions.
- Use short-lived branches from `main`, named `feature/<topic>`, `fix/<topic>`, `docs/<topic>`, or `codex/<topic>`. Review changes before merging; do not push, merge, or deploy unless asked.
- Use Conventional Commit messages when committing, for example `docs: establish project foundation`. Do not commit unless asked.
- Update documentation when actual architecture, setup, interfaces, methods, tests, or status change.

## Local checks

Backend (from `backend/`):

```powershell
uv sync
uv run pytest
uv run ruff check .
```

Frontend (from `frontend/`):

```powershell
npm ci
npm run check
npm run build
```

Run the checks relevant to a change and report the commands and actual results. Software tests do not establish scientific validity.
