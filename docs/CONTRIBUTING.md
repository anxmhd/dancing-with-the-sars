# Contributing

## Before work

Read [AGENTS.md](../AGENTS.md), [the architecture](ARCHITECTURE.md), [the data catalog](DATA_CATALOG.md), and current [status](STATUS.md). Confirm the task scope, files, interfaces, acceptance criteria, tests, and documentation updates. Wait for explicit approval when requested.

## Git workflow

- Work from `main` using short-lived branches: `feature/<topic>`, `fix/<topic>`, `docs/<topic>`, or `codex/<topic>`.
- Keep changes focused and avoid simultaneous edits to shared contracts. Coordinate ownership before parallel work.
- Use pull requests for review once a remote repository exists. Require relevant CI checks before merging.
- Use Conventional Commit format when committing (for example, `docs: establish project foundation`). Commit, push, merge, and deploy only when authorized.
- Never reset, clean, force-push, or overwrite another contributor's work without explicit authorization.

## Code and data

Use TypeScript strict mode and typed Python. Prefer readable, modular code and avoid speculative abstractions. Do not add dependencies without a concrete purpose. Keep credentials and large raw scientific data out of Git. Follow the data-access and evidence rules in [AGENTS.md](../AGENTS.md).

## Verification and reporting

Run relevant checks and report exact commands and outcomes. Update documentation to describe actual behavior and status. Do not claim scientific validation based only on software tests.
