# Scientific output vs shared contract compatibility audit

**Audit date:** 2026-11-14

**Scope:** Read-only audit of the current shared semantic contract, two real CLI result artifacts, producing code, and existing consumers. No contract or implementation changes were made.

## Executive finding

The current shared contract is specifically a Sentinel-2 NDVI parcel time-series contract. It can represent the core S2 NDVI observation after an explicit mapping, but the S2 CLI JSON is not itself contract-shaped: it mixes `camelCase` wrapper keys and Python `snake_case` dataclass fields, and it omits several response-level fields. The contract does not represent Sentinel-1 VV/VH measurements as currently written. The project has no backend API schemas/routes/serializer or frontend result model, so no downstream result consumer exists to confirm compatibility.

Recommendation: **coordinated contract revision before multisensor API/frontend integration**, with a backward-compatible S2 extension if possible. Retain a common parcel/acquisition/result envelope and provenance/quality concepts, but define explicit sensor-specific measurement metadata and payloads. Do not merge S1 values into the NDVI `index`/`value` shape or compare them as equivalent measurements. NISAR compatibility remains unverified because there is no actual NISAR output in this audit.

## Files and schemas inspected

### Requested documentation

- `docs/DATA_CONTRACTS.md` — semantic source of truth; currently covers GeoJSON parcels, NDVI request intent, scientific interface, NDVI response/observation, generic quality/provenance and errors.
- `docs/TEAM_CONTRACTS.md` — vocabulary, naming, dates/units, missingness semantics, role ownership and contract-change process.
- `docs/ARCHITECTURE.md` — module responsibilities and one-way boundaries; API/serializer and frontend result integration are still future work.
- `docs/INTEGRATION_GUIDELINES.md` — single-contract/fixture guidance and integration gates.
- `docs/SCIENCE_PROCESSING.md` — current provisional methods and scientific limits.
- `docs/STATUS.md` — implementation and verification status; one S2 and one S1 real result exist; NISAR data is unavailable.

### Results, models, producers, consumers

- `data/results/sentinel2_el_haouz_Trees_20240110_036_20261101.json`
- `data/results/sentinel1_el_haouz_Trees_20240110_036_20261026.json`
- `backend/src/dancing_with_sars/science/vegetation/ndvi.py` — typed Python dataclasses `NdviProvenance`, `NdviObservation`, `NdviSeries`; processing and series assembly.
- `backend/src/dancing_with_sars/data_access/sentinel2.py` — S2 STAC/COG workflow, wrapper assembly, JSON serialization via `asdict` and `json.dumps`.
- `backend/src/dancing_with_sars/science/radar/sentinel1_rtc.py` — parcel-level gamma-zero summary dictionary.
- `backend/src/dancing_with_sars/data_access/sentinel1.py` — S1 STAC/COG workflow, JSON wrapper assembly and CLI serialization.
- `frontend/src/App.tsx` and `frontend/src/` — only a static shell and shell test; no API client, result types, fixtures, or sensor data model.
- `backend/src/` — no FastAPI application, route, API schema, or response serializer exists. `DATA_CONTRACTS.md` remains the only shared semantic response contract.

The local Git checkout was also inspected: `main` is at `23ef0a8`; `feature/scientific-foundation` is at `fbbff7c`, one commit ahead of its remote-tracking ref, and has uncommitted scientific implementation/results. This is local checkout state, not evidence about other developers' clones.

## Field-by-field compatibility

“Existing contract” below means the current NDVI time-series contract. A dash means the contract does not define that field for the listed sensor/result. “Not directly” means the result artifact has relevant information but cannot be consumed as that contract shape without mapping or supplemental metadata.

| Field | Existing contract | Sentinel-2 output | Sentinel-1 output | Compatibility |
| ----- | ----------------- | ----------------- | ----------------- | ------------- |
| Sensor/platform and product | Provenance supports provider, dataset, external product IDs, version; observation supports acquisition reference/time. No sensor enum or sensor-specific structure. | Source names Copernicus, S2 L2A, S2C platform, exact STAC/product IDs, version 05.13. | Source names Planetary Computer S1 RTC, S1C, exact STAC/product IDs, `productType=GRD`, `processingLevel=1`, and processing time. | Source facts present in artifacts. Contract can carry general provenance but has no explicit sensor/product descriptor. For S1, collection/item is RTC while product metadata says GRD/level 1; preserve the catalog values and clarify their relationship before presenting them as one product-level label. |
| Acquisition date/time | `observationDate` required; `acquiredAt` optional nullable ISO instant. | Exact `acquiredAt` UTC and `acquisition_date` date under nested snake_case provenance. | Exact UTC `source.acquiredAt`. | Semantically supportable, but S2 needs mapping to camelCase observation fields; S1 lacks contract's observation wrapper. |
| Spatial reference/resolution | Parcel geometry is GeoJSON WGS84 at API boundary. No observation CRS/resolution field. | Geometry CRS EPSG:4326 and raster/SCL CRS EPSG:32629; 10 m B04/B08 and 20 m SCL source resolution. Raster transforms included; explicit output pixel-size field absent. | Geometry CRS EPSG:4326; asset CRS EPSG:32629 and 10 m x 10 m pixel resolution in each polarization summary. | Processing metadata exists in artifacts but spatial resolution and analysis-grid CRS are not part of the response contract. |
| Parcel identifier and geometry/reference | `parcelId` required on response; parcel feature has `parcelId`, source reference and geometry. | `observation.provenance.parcel_id` only; actual result JSON contains no geometry or source reference. | Top-level `parcelId`; no geometry or source reference in result. | Identifier is present but S2 uses nested snake_case. Neither artifact is self-contained with parcel geometry/sourceRef; can link to the parcel feature by ID if that feature is separately available. |
| Measurement name/definition | `index` is required and enum is currently `NDVI`; observation has one `value`. | NDVI is clear from selected workflow/method ID, but no explicit `index` field in JSON; numeric value nested in observation. | Explicit quantity: terrain-corrected gamma-naught backscatter power; channel-specific summaries are `medianGamma0Power` and `meanGamma0Power`. | S2 concept maps to current contract. S1 cannot safely map to `index=NDVI` or a generic unqualified `value`; separate quantity and polarization semantics are necessary. |
| Value and units/representation | Finite `value`, nullable for excluded/unassessed candidates; top-level `unit`, NDVI unit `1`. | `value=0.368249284984567`, accepted; output omits explicit unit. NDVI is dimensionless by definition, and the contract calls for `1`. | VV median 0.12140032649040222 and VH median 0.016289573162794113, plus means; declares unit `1`, stored linear gamma0 power, not dB. STAC omits scale/offset and unit metadata. | S2 missing explicit unit field in output. S1 carries a unit declaration but its mapping/scaling convention is not independently established from STAC; this provenance limitation must travel with it. |
| Polarization/spectral bands | No field: current contract assumes NDVI and does not define channels/bands. | B04 red and B08 NIR; SCL quality band; native resolutions, scale/offset and SCL resampling are included in `source.bands`. | VV and VH, separately described; C-band and center frequency 5.405 GHz are recorded. | Sensor-specific metadata is present but unsupported by current common contract. Keep band/polarization facts explicit and sensor-specific. |
| Valid/total pixels and coverage | `quality.validPixelCount` and `totalPixelCount` optional nullable counts. No fraction field. | 22 valid / 22 total, 1.0 fraction; nested snake_case; excluded SCL pixel count 0. | For each polarization: 22 valid / 22 total, fraction 1.0. | Counts fit conceptually; S2 key casing differs and S1 requires counts attached per polarization/measurement, not a single observation-wide count. |
| Quality state, flags and exclusions | `quality.status` accepted/excluded/unknown, nullable source/normalized `flags`, `reasons`; explicitly distinguishes unknown from no flags. | `quality_status=accepted`, empty reasons, QA policy and excluded SCL classes; no `flags` array or explicit evaluated QA flags. SCL retained-class caveat. | Top-level `status=available` is not a per-polarization quality enum; quality rule documents nodata/nonfinite/negative exclusions and no added filtering. No flags/reasons or channel-level acceptance status. | S2 status/reasons map semantically but are not contract-shaped; QA information needs a documented mapping. S1's availability status must not be treated as the contract's accepted assessment. |
| Processing method and parameters | Provenance has method and parameter object; quality defines counts/status; does not include grid details. | Median; excluded SCL {0,1,3,8,9,10,11}; center-based pixels; 5-pixel and 0.5-fraction thresholds; reflectance scale/offset; grids and method version are present across JSON. | Median of finite, nonnegative, non-nodata linear samples; pixel-center inclusion; no speckle/extra QA; raster metadata and summary per polarization. | Both have substantial method details in artifacts, but no mapping to the shared provenance object exists. S1 has no explicit stable named method/version field. |
| Source provenance/product metadata | `DataProvenance` supports provider, dataset, external IDs, product version, software, method, parameters, processedAt; no explicit platform, geometry, band/polarization, CRS or resolution fields. | Provider/catalog and mirror identifiers, product URI, platform, time, version, orbit, tile/cloud cover, source band roles and scales. No processing software/version or processedAt. | Provider, STAC/catalog IDs, platform, acquisition/processing time, product type/level, mode, band/frequency, polarization, orbit/direction, and asset metadata. | Strong source metadata is retained in artifacts; the shared provenance shape is only partially expressive. Do not expose temporary signed asset URLs (not present in these artifacts). |
| Uncertainty/limitations | No dedicated limitation/uncertainty field. Provenance/quality can carry details but do not define interpretation caveat semantics. | Retained SCL classes caveat is a `qualityPolicy` note; no direct output caveat about NDVI being indirect or no stress inference. Scientific documentation carries this safeguard. | `processing.interpretationLimit` explicitly says backscatter is influenced by multiple factors and is not direct soil moisture/stress. Unit metadata omission also stated. | S1 output carries interpretation caveat; S2 artifact does not. Neither is represented by a defined contract field. |
| Status/empty results | `resultStatus`: available/noObservations/noValidObservations; observations array always present. | One acquisition-only artifact has no top-level status or array envelope. | `status=available` or `no_valid_pixels`, with no standardized resultStatus vocabulary. | Neither artifact directly implements the time-series response envelope. |

## Missing or ambiguous fields

### S2 result artifact

- It is a single-acquisition CLI artifact, not a `VegetationTimeSeriesResponse`: missing top-level `parcelId`, `index`, `unit`, requested `startDate`/`endDate`, `resultStatus`, `observations[]`, and contract `provenance` object.
- `observation` is produced by `dataclasses.asdict`, so its nested fields are Python `snake_case`, conflicting with the JSON `camelCase` convention if used as a public payload. This is acceptable for an internal Python model but needs explicit mapping at a future API boundary.
- Its acquisition reference and date live under `observation.provenance` (`acquisition_id`, `acquisition_date`), not contract observation fields (`acquisitionId`, `observationDate`). The product ID is a real external ID; no separate internal `acquisitionId` is established in the artifact.
- Unit `1` is not serialized, although the shared contract explicitly requires it.
- `valid_fraction` and `excluded_scl_pixel_count` are extra useful values not named in the shared quality contract; fraction could be represented by counts but should not be silently inferred by consumers if explicit coverage is desired.
- The actual parcel geometry/reference and any parcel source provenance are absent from the result. Its `parcelId` identifies the input parcel only.
- No processed-at instant or processing software/version is recorded. The method identifier and parameters are recorded.
- The artifact includes a quality policy and caveat about retained SCL classes, but not a dedicated uncertainty/interpretation-limit field. `accepted` means the implemented provisional thresholds passed; it is not scientific validation.

### S1 result artifact

- It has no shared observation/result envelope, `observationDate`, `acquisitionId`, request period, or standardized `resultStatus`.
- Quality counts/fractions and measurements are per polarization. A single observation-level value/count would conflate VV and VH and is unsuitable.
- `available` indicates one or more channel summaries have valid pixels. It does not establish that every requested polarization passed the same acceptance policy, and it is not equivalent to contract `quality.status=accepted`.
- No original provider QA flags are exposed. The exclusions are described as a text rule; the artifact states no additional QA filter was applied.
- The `unit: "1"` convention is declared for stored linear gamma0. The STAC omission of unit/scale/offset remains an explicit source-metadata limitation; reviewers must not interpret the number as dB or as direct soil moisture.
- The parcel geometry and source reference are absent. CRS, pixel grid, and resolution are reported per polarization.
- Product-specific measurement metadata is rich in the result but has no representation in the existing NDVI-only contract.
- The result combines an `sentinel-1-rtc` collection item with `productType=GRD` and `processingLevel=1`; the artifact does not explain the product-level relationship. Do not normalize these into one label without inspecting the collection metadata and agreeing on displayed terminology.

### Contract design gaps and semantic cautions

- The current contract is sufficient as an NDVI semantic description, but does not contain a fully sensor-neutral observation envelope with per-measurement metadata. Its top-level `unit` and singular observation `value` assume one measurement definition applies to the entire response.
- Its `DataProvenance` is generic enough for provider/product IDs and processing lineage but has no agreed place for platform/sensor, polarization/band roles, CRS/resolution, or sensor-specific product metadata. Avoid a large generic metadata bag unless consumers have a concrete need.
- The contract's optional `acquiredAt` can retain instants, while date-only ordering uses `observationDate`; this remains appropriate for S2/S1 once mapped.
- Existing quality concepts are useful, but S1 channel-specific quality/coverage needs to remain attached to each channel measurement. Do not map S1 top-level `available` to accepted quality.
- A `value` alone is not interpretable across NDVI, S1 gamma0, and NISAR GCOV. Quantity, unit/convention, sensor/product, and (where applicable) band/polarization must travel with each measurement.
- NISAR future compatibility is **not verified**. The local reader source code is not a real product result, Earthdata access has not yielded an HDF5 product, and no actual NISAR result was inspected here. No NISAR field names or semantic mapping are approved by this audit.

## Sufficiency and minimal recommendation

| Result type | Can current contract represent it? | Audit conclusion |
|---|---|---|
| Sentinel-2 parcel NDVI acquisition | Core value/date/quality/provenance concepts: yes, with mapping. Actual result JSON directly: no. | Preserve the existing NDVI response as the first consumer view; define explicit mapping and fill/retain contract-required fields before API integration. |
| Sentinel-1 VV/VH RTC gamma0 | No, not without placing SAR values into NDVI-specific fields or losing channel-specific semantics. | Add a backward-compatible multisensor extension before exposing S1 through an API. |
| Future NISAR GCOV | Unknown. | Revisit only after an actual product/result and its attributes, units, channels, flags, and method are inspected. |

The smallest practical direction is a **coordinated contract revision**, ideally backward-compatible for the existing S2 NDVI response:

1. Retain the common parcel/acquisition context (parcel ID, acquisition time/date, product identity, quality state, and provenance).
2. Make the measurement definition explicit per measurement: quantity/index name, numeric value and unit/convention; keep VV and VH as distinct channel measurements, and keep NDVI distinct from both.
3. Attach resolution/CRS and coverage/counts where they describe that measurement's raster grid; do not force one observation-wide count/resolution if channels differ.
4. Carry quality flags/reasons and documented limitations without equating “accepted” with scientific validation.
5. Decide how parcel reference and processing provenance are linked/presented, while avoiding raw asset URLs, credentials, or duplicated product records.

These are recommendations for contract review only, not proposed schema fields ready for implementation. Field names and required/nullable semantics need approval from the frontend, backend, and scientific owners. A machine-readable authority (likely OpenAPI if HTTP is selected) should then be chosen as the contract requires. Do not introduce a generic sensor abstraction solely for hypothetical future sensors.

## Downstream compatibility and ownership

There is currently no implemented backend API/schema/serializer and no frontend response model, so outputs are not yet consumed downstream. The frontend shell in `frontend/src/App.tsx` displays only static text. Neither result artifact can currently be passed to a project API because no such API exists.

If the team approves the recommended extension, responsible owners and likely files are:

| Owner | Files to review/change after approval | Responsibility |
|---|---|---|
| Contract editor, with all three owners reviewing | `docs/DATA_CONTRACTS.md`, `docs/DOMAIN_MODEL.md`, `docs/INTEGRATION_GUIDELINES.md` | Define common envelope and sensor-specific measurement semantics, required fields, units, quality/provenance rules, examples and the authoritative machine-readable contract decision. |
| Scientific/Earth-observation developer | `backend/src/dancing_with_sars/science/vegetation/ndvi.py`, `backend/src/dancing_with_sars/science/radar/sentinel1_rtc.py`, `backend/src/dancing_with_sars/science/radar/nisar_gcov.py`, relevant data-access workflows and tests | Preserve typed scientific meanings and quality/provenance; provide an explicit adapter/mapping only where needed. Do not change calculations merely to satisfy presentation shape. NISAR mapping waits for real product inspection. |
| Backend/application developer | Future API/application/schema/serializer files under `backend/src/` (none exist yet), plus backend contract tests | Validate request/response and map scientific outputs into the approved canonical contract; keep provider parsing and science out of HTTP schema. |
| Frontend/UX developer | Future contract-derived types/API client and UI under `frontend/src/`, plus agreed shared fixture | Consume same canonical contract; preserve sensor, date, quantity, unit, per-channel quality/coverage, provenance and limitations in presentation. |

The real result JSON files are scientific CLI artifacts under `data/results/`, not API responses. Avoid changing their serialization until the team decides whether they are stable internal artifacts or should conform to a new contract; the API can map the existing scientific outputs without renaming their Python fields.

## Branch synchronization

This checkout shows `main` at `23ef0a8` and `feature/scientific-foundation` at `fbbff7c`, one local commit ahead of `origin/feature/scientific-foundation` (`0d3baa7`), with additional uncommitted scientific changes and the real result files. There are no other local feature branches visible. Therefore:

- No other branch synchronization can be confirmed from this checkout.
- Any developers implementing against `main` need the reviewed/approved scientific implementation and result evidence made available before integrating those workflows; the current local changes are not reflected in the remote-tracking feature branch.
- Before parallel API/frontend implementation, synchronize everyone to the approved contract revision and one shared fixture/source of truth. Do not start separate payload definitions on branches.
- This audit does not publish, commit, merge, or synchronize branches.

## Recommendation

**Coordinated contract revision, backward-compatible for S2 where practical.** The current contract remains a suitable semantic base for the original NDVI workflow, but it cannot faithfully carry S1 VV/VH outputs in its current singular NDVI value shape. Existing outputs contain useful scientific metadata but are CLI artifacts, and no application consumer currently exists. Define the minimal per-measurement extension with all owners before API/frontend integration. Treat actual NISAR compatibility as open until an actual NISAR result is available and audited.
