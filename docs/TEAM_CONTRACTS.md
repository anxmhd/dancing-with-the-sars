# Team contracts

## Canonical vocabulary

Use these terms consistently:

- **Study area:** the selected geographic analysis extent.
- **Agricultural parcel:** a source-backed geographic unit used for parcel-level exploration. It is not automatically a validated crop or irrigation label.
- **Platform:** the spacecraft/mission vehicle; **sensor:** the instrument that collects data.
- **Satellite product:** provider-defined collection/product and processing level/version.
- **Acquisition / satellite observation:** a source observation at a product-specific granularity.
- **Parcel observation:** one parcel/acquisition record containing one or more sensor-specific measurements and their quality/provenance.
- **Provenance:** source and processing lineage.
- **Quality:** source flags or a derived acceptance/exclusion assessment; state which is represented.
- **Missing:** no observation is available. **Excluded:** a candidate exists but fails a stated quality policy. **Unknown:** data or quality metadata is not available/assessed.

Use the domain definitions in [DOMAIN_MODEL.md](DOMAIN_MODEL.md); do not introduce synonyms in APIs or tests without agreement.

## Naming and representation

- **TypeScript:** `PascalCase` for types/components, `camelCase` for variables/functions/properties, and `UPPER_SNAKE_CASE` only for true constants. Use string literal unions for finite states.
- **Python:** `PascalCase` for classes, `snake_case` for modules/functions/variables, and `UPPER_SNAKE_CASE` for constants.
- **JSON:** `camelCase` property names; stable opaque identifiers are strings. GeoJSON standard member names remain standard lowercase names.
- **Dates and times:** date-only values use ISO 8601 `YYYY-MM-DD`. Instants use ISO 8601/RFC 3339 with an explicit offset; normalize to UTC only when the source represents an instant, and preserve source provenance. Never invent a time when only a date is supplied. Requested start/end dates are inclusive.
- **Geography:** API vector features use GeoJSON WGS 84 longitude/latitude order. Internal raster/vector processing may use an appropriate CRS, but must record and test transformations. Do not infer CRS from coordinate magnitudes.
- **Units:** include an explicit unit for numeric scientific outputs. NDVI uses dimensionless unit `1`. Record source units and conversion method for other variables before adding them.
- **Missing/invalid values:** JSON numeric values must be finite. Do not use NaN, infinity, or zero as a missing sentinel. A missing observation is absent; an excluded/unassessed candidate is explicit with `value: null` and quality state; a nullable count is unknown/unavailable, not zero.

## Git and review

- Create short-lived branches from `main` named `feature/<topic>`, `fix/<topic>`, `docs/<topic>`, or `codex/<topic>`.
- Keep changes focused and use Conventional Commit messages if committing. Do not commit, push, merge, or deploy without authorization.
- Use pull requests for review; run the relevant existing checks. Do not use force-push or destructive history/file commands to resolve normal conflicts.
- A contract change is cross-team work: describe the consumer need and compatibility impact, update the canonical contract first, get affected owners' review, then update implementations/fixtures and verify both sides.

## Shared-file and parallel-work rules

- `contracts/multisensor-response.schema.json` and `contracts/api-error.schema.json` are the canonical wire contracts. `docs/DATA_CONTRACTS.md` explains their semantics; it is not a second payload definition.
- Coordinate changes to `contracts/`, shared fixtures, validator, `docs/DATA_CONTRACTS.md`, and CI with all affected developers. Assign a contract editor/reviewer; one person owns each implementation file set.
- Frontend may build against the shared fixtures. Backend owns request validation, orchestration, and API serialization; it does not own science algorithms. Scientific developers keep product-specific result semantics in the science layer.
- If an unresolved product/data fact affects shape or behavior, retain explicit null/limitation where supported and stop only the dependent claim or implementation rather than guessing.

## Role ownership for the first workflow

- **Frontend/UX developer:** owns `frontend/`, user interaction and presentation, and contract-derived client types/mocks. Reviews any contract field the UI consumes.
- **Backend/application developer:** owns backend API/application code, request validation, orchestration, and schema-compliant serialization.
- **Scientific/Earth-observation developer:** owns approved source inspection/adapters and science calculations, quality evaluation, and processing provenance. Reviews whether contract fields and status semantics are scientifically supportable.
- **Shared:** all three review schema and fixture changes and approve contract evolution. The contract editor owns the schema files; no single role unilaterally decides measurement meaning or consumer behavior.

## Decisions and conflict resolution

Scientific safeguards and verified source facts take priority over convenience. Resolve naming or payload conflicts by identifying the consuming task and source of truth, reviewing the contract with the affected owners, and documenting consequential decisions in an ADR. If evidence is missing or the owners cannot agree, pause only the dependent work and ask the project lead to decide; do not silently fork the contract.
