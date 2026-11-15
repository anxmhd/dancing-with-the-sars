# Project instructions

## Purpose

Dancing with the SARs is a scientific web application for exploring agricultural dynamics and climate-related vegetation stress in Morocco's Haouz plain. Scientific credibility, reproducibility, and clear communication take priority over speed or decorative complexity.

## Current state

This repository contains the project foundation and shared first-workflow contracts. There are no application features, API routes, verified datasets, or scientific results yet. Read [README.md](README.md), [the architecture](docs/ARCHITECTURE.md), [the domain model](docs/DOMAIN_MODEL.md), [the data contracts](docs/DATA_CONTRACTS.md), [the team contracts](docs/TEAM_CONTRACTS.md), [the integration guidelines](docs/INTEGRATION_GUIDELINES.md), [the data catalog](docs/DATA_CATALOG.md), [the roadmap](docs/ROADMAP.md), and [the status](docs/STATUS.md) before changing the project.

## Scope and data rules

- Work only within the task the user approved. Present a plan and wait when approval is requested.
- Do not download, scrape, process, or integrate scientific data without a task that identifies the source/product, area, dates, purpose, and expected output.
- Record dataset availability and processing status accurately. Downloaded or processed does not mean scientifically validated.
- Preserve the distinction between observation, derived indicator, estimate, association, interpretation, and hypothesis. Never state correlation as causation.
- Do not interpret SAR backscatter as a direct measurement of groundwater depletion. Do not implement forecasting without explicit approval.
- Keep raw and large satellite data out of Git. Never commit credentials or local environment files.

## Architecture boundaries

- `frontend/` owns browser presentation and user interaction. It must not process satellite archives or embed scientific calculations.
- `backend/` will own the Python application package. Future API, domain, science, and data-access modules must have explicit responsibilities and one-way dependencies documented before they are introduced.
- The scientific layer must remain independent of HTTP and presentation code. Data access and scientific processing must remain separate.
- Do not add speculative modules, endpoints, databases, cloud services, or dependencies. Add a dependency only for an approved, concrete requirement.
- Keep API contracts explicit and validate inputs and outputs. Do not create placeholder endpoints.
- Treat `docs/DATA_CONTRACTS.md` as the current shared semantic contract for the first workflow. Before API implementation, agree on a machine-readable contract format and keep one authoritative shape rather than independent frontend/backend copies.

## Development conventions

- Use TypeScript strict mode for frontend code and type annotations for Python code.
- Prefer small, focused changes and straightforward implementations. Avoid unrelated refactoring and shared-file collisions.
- Use short-lived branches from `main`, named `feature/<topic>`, `fix/<topic>`, `docs/<topic>`, or `codex/<topic>`. Review changes before merging; do not push, merge, or deploy unless asked.
- Use Conventional Commit messages when committing, for example `docs: establish project foundation`. Do not commit unless asked.
- Update documentation when actual architecture, setup, interfaces, methods, tests, or status change.

## Frontend UI toolkit guidance

- The frontend foundation does not currently include Tailwind CSS or daisyUI. Do not add either as part of unrelated work; add them only for an approved UI task with a concrete need.
- When a task uses daisyUI, follow the workspace skill at [`.agents/skills/daisyui/SKILL.md`](.agents/skills/daisyui/SKILL.md) and verify setup against the official documentation linked there.
- Keep scientific meaning and uncertainty clear in the interface. daisyUI components are presentation tools and must not imply stronger evidence than the underlying data supports.

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
