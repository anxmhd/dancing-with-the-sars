# Integration guidelines

## Current contract stage

The first workflow is specified in [DATA_CONTRACTS.md](DATA_CONTRACTS.md), but no API, scientific module, or data source is implemented. That document is the semantic contract today. Before independent API/frontend implementation, approve the contract and choose one machine-readable authority (OpenAPI for HTTP is the likely fit); derive or validate all client types, response fixtures, and backend serialization against it. Do not add a second independently maintained payload definition.

## Independent development

### Frontend and user experience

- Use a clearly synthetic, contract-shaped fixture to build parcel selection, time-series presentation, provenance, quality, and loading/empty/error states before a real backend exists.
- Mark mocks and screenshots as synthetic. Never imply their values, dates, geometry, or identifiers are real Haouz observations.
- Keep API client types aligned with the approved contract; do not implement NDVI, cloud masks, parcel aggregation, or provider access in the browser.

### Scientific processing

- Test calculations independently with small synthetic arrays/fixtures and explicit input metadata. No downloaded product is required for deterministic unit tests.
- Keep provider/file parsing at the data-access boundary; pass explicit bands, masks, geometry, CRS, and product metadata into processing.
- Return a typed result carrying quality state and processing provenance. Do not import FastAPI, API schemas, or frontend code.
- Do not assume the pixel statistic, cloud policy, product level, CRS, or spatial alignment until an actual product and method are reviewed.

### Backend and application architecture

- Define request validation and response serialization around the approved data contract, not database/source table shapes.
- Orchestrate the scientific public interface; map documented domain/input/source failures to API errors without reimplementing processing.
- Keep HTTP schemas at the API boundary and map from science/domain results explicitly.
- Add only the endpoint(s) required for parcel selection and the requested parcel/time-series result. Paths and HTTP methods remain undecided until API design is approved.

## Shared fixtures and contract checks

When implementation starts, keep one small synthetic cross-language fixture at `tests/fixtures/vegetation-series.synthetic.json` (or another single path agreed by all three owners). It should contain no real coordinates or provider product IDs; fabricated IDs and measurements must be visibly identified as synthetic in the filename and fixture documentation. The frontend uses it for mock rendering; backend contract tests validate serialized responses against the same approved machine-readable contract; scientific tests use separate input fixtures when testing algorithms.

Do not maintain different frontend and backend copies of the same response. Once the contract is machine-readable, validate the shared fixture and representative backend output against it. Cover accepted observations, excluded observations with null values, empty/no-observation results, and error cases as the applicable implementation is introduced. Reuse the existing Vitest and Pytest setups; do not add a framework just for the contract.

## Integration and merge gate

Before merging work that crosses module boundaries:

1. Contract change is approved by frontend, backend, and scientific owners.
2. Frontend mock and backend serializer conform to the same contract and fixture.
3. Scientific output and quality/provenance fields map to the backend response without algorithm duplication.
4. Relevant Vitest, Pytest, contract, lint/type, and build checks pass.
5. At least one end-to-end happy path uses synthetic data once an API and workflow exist; any browser automation framework choice is deferred until there is an actual runnable flow.
6. Empty, invalid, quality-excluded, and unavailable-data paths are reviewed, with missing values still missing.
7. Documentation and status describe implemented, tested, and scientifically validated states separately.

No live external data service is required for routine CI. Scientific validation against real/reference data is a separate, explicitly approved task and is not replaced by a passing fixture-based contract test.
