# Project status

Last updated: 2026-11-14

## Established

- Project instructions and scientific safeguards in `AGENTS.md`.
- Initial React/TypeScript/Vite frontend shell with a Vitest smoke test.
- Python package metadata, Pytest smoke test, Ruff configuration, and a generated `uv.lock`.
- Architecture, dataset roadmap/status vocabulary, methodology safeguards, validation approach, contribution workflow, and phased roadmap.
- Git ignore/line-ending/editor settings, local branch `main`, and a CI workflow for pushes and pull requests to `main`.

## Not established

- No API routes or FastAPI runtime dependency.
- No map/chart library installed, application features, database, deployment, or cloud infrastructure.
- No scientific data acquired, inspected, processed, integrated, or validated.
- No GitHub remote configured and no commits made by this foundation task.

## Verification status

On Python 3.13.4 and Node.js 22.16.0, `uv sync --locked`, `uv run --locked pytest` (1 passed), `uv run --locked ruff check .`, `npm ci`, `npm run check` (typecheck and 1 test passed), and `npm run build` completed successfully. These checks exercise only the foundation; they are not scientific validation.

## Next step

Review this foundation. The next implementation phase should define the first concrete user workflow and its acceptance criteria before adding a feature or data source.
