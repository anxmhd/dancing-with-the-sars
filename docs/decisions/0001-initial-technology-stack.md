# ADR 0001: Initial technology stack and repository layout

- Status: Accepted
- Date: 2026-11-14

## Context

The project starts without an application codebase. It needs a maintainable web foundation for geospatial exploration and later Python-based scientific work while avoiding infrastructure and data assumptions before requirements are verified.

## Decision

- Use a monorepo with `frontend/` and `backend/` as the current code roots.
- Use React, TypeScript strict mode, and Vite for the frontend; Vitest provides the initial test runner.
- Use a Python package managed by uv. Pytest and Ruff are development tools.
- Use Leaflet as the planned first map library when map work is approved.
- Use FastAPI when a concrete API requirement exists; defer its runtime dependency and all endpoints until then.
- Keep future API/domain/science/data responsibilities separated by documented, one-way boundaries. Create these modules only when needed.
- Do not introduce a database, cloud services, scientific processing libraries, or raw data at foundation stage.

## Rationale

React/TypeScript/Vite provides the approved web stack; Python supports future geospatial/scientific work. Separate directories and documented dependency rules allow independent development. Deferring feature libraries and services keeps this scaffold small and avoids implying data or capabilities that do not exist.

## Consequences

Frontend and Python checks are independently runnable. API and science module boundaries are documented before code is added. Later changes to the stack or boundaries should be recorded as a new decision with their rationale.
