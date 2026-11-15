> **Historical document ? superseded.** This file records an earlier audit/draft stage and is retained for decision history. The current contract authority is `contracts/multisensor-response.schema.json`; implementation guidance is in `docs/IMPLEMENTATION_GUIDE.md`.

﻿# Multisensor contract draft review

**Review date:** 2026-11-14
**Reviewed draft:** `docs/MULTISENSOR_CONTRACT_DRAFT.md`
**Scope:** Contract/design review only. The draft, authoritative contracts, and application code were not modified.

## Files inspected

- Contracts and architecture guidance: `docs/MULTISENSOR_CONTRACT_DRAFT.md`, `docs/DATA_CONTRACTS.md`, `docs/DOMAIN_MODEL.md`, `docs/TEAM_CONTRACTS.md`, `docs/INTEGRATION_GUIDELINES.md`.
- Real outputs: `data/results/sentinel2_el_haouz_Trees_20240110_036_20261101.json` and `data/results/sentinel1_el_haouz_Trees_20240110_036_20261026.json`.
- S2 processing and extraction: `backend/src/dancing_with_sars/science/vegetation/ndvi.py` and `backend/src/dancing_with_sars/data_access/sentinel2.py`.
- S1 processing and extraction: `backend/src/dancing_with_sars/science/radar/sentinel1_rtc.py` and `backend/src/dancing_with_sars/data_access/sentinel1.py`.

## Overall assessment

The draft's central approach is sound: a parcel/acquisition envelope with multiple explicitly identified measurements, with grid and quality attached to each measurement. This avoids treating NDVI, Sentinel-1 VV, and Sentinel-1 VH as interchangeable. The example's numerical measurement values, acquisition instants, parcel identifiers, raster transforms, CRS, resolution, and pixel coverage match the inspected output JSON files. The S2 band roles/scales and SCL resampling/policy also match the producer output.

**Recommendation: revise before approval.** Several issues prevent safe use as the authoritative API contract: the S1 source product identifier is dropped, the S2 COG mirror provenance is dropped, the top-level status cannot report per-sensor missingness when both sensors are requested, and the documented statistic rule contradicts the included S1 mean measurements. The draft also represents the original NDVI contract as a breaking replacement without a migration decision, and S1 unit/product processing semantics need tighter source qualification. These are addressable without changing the overall architecture.

## Findings by severity

### Critical — must fix before approval

| Finding | Evidence and impact | Required correction |
|---|---|---|
| Source identifiers are conflated and one is lost for S1. | The S1 result contains both `source.stacItem` (`..._0140FD_rtc`) and `source.productIdentifier` (`..._0140FD_DEAB`). The draft's `source.productId` is populated with the STAC item ID, omitting the distinct original product identifier. Consumers cannot tell whether `productId` identifies the RTC catalog item or the Sentinel-1 source GRD product. | Distinguish catalog item ID from source product identifier in the contract and preserve both values when available. Define which identifier forms the client observation key. Do not silently call a STAC item ID the product ID. |
| S2 data-asset provenance is incomplete. | The S2 workflow retrieves product metadata from Copernicus but reads raster bands from Microsoft Planetary Computer's mirrored COG assets. The result records `mirror` and `mirrorItem`; the draft only names Copernicus as provider and drops both mirror facts. This obscures where the actual pixel bytes came from and weakens reproducibility. | Distinguish product authority/catalog provenance from asset access/mirror provenance. Retain the mirror dataset/item identity, without exposing temporary signed asset URLs. |
| Combined-sensor result status hides sensor-specific missingness. | The draft allows querying both missions and defines overall `available` when any measurement is accepted. If S2 has observations and S1 has none (or the reverse), the response contains no status that says which requested sensor was unavailable/no-observation. That can make missing sensor coverage look like an intentionally unrequested sensor. | Either make each response scoped to exactly one requested mission, or include the requested mission set and a per-mission status (`available`, `noObservations`, `noValidObservations`/unavailable as appropriate). Do not infer a missing sensor from absent array items. |
| Statistical rule contradicts the response examples. | The common field table says the statistic is “currently `median` for both inspected results,” but the S1 example includes both `median` and `mean` for each of VV and VH, and the S1 JSON contains both. The draft later lists `mean` as supported. This is internally inconsistent and can produce frontend selection/rendering differences. | State the per-quantity/statistic combinations explicitly: current S2 NDVI output is median; current S1 outputs include median and arithmetic mean for each polarization. Specify that S1 mean is computed in linear gamma-zero representation, not dB. Keep each statistic as a separate identified measurement or define an equally unambiguous structure. |

### Important — should fix before implementation

| Finding | Evidence and impact | Required correction |
|---|---|---|
| S1 gamma-zero unit is not provider-verified. | The result adapter hard-codes `unit: "1"`; the same result explicitly says STAC omits unit, scale, and offset and calls values “stored gamma0 power, not dB.” The draft requires `unit: "1"` but only places this caveat at observation-level `limitations`, which can be separated from a displayed measurement or lost by a consumer. | Keep the representation explicit as linear gamma-zero values and carry the unit-source/scale limitation with each affected measurement (or make the unit status a typed part of the measurement). Distinguish the adapter's declared convention from a unit declared by the source. Do not label these values dB. |
| `gamma0BackscatterPower` mixes physical quantity and numeric representation. | The product docs describe RTC output as normalized gamma-zero backscatter; the draft's quantity label can be read as a physical power in watts, even though it separately says linear representation and unit `1`. The code calls it gamma-zero backscatter power. | Define the quantity as the gamma-zero backscatter coefficient (γ⁰) and independently define `representation` as linear power values. Keep VV/VH as polarization metadata. State that the reported values are not dB and not direct soil-moisture observations. |
| RTC product lineage fields need interpretation, not just a warning. | The S1 item is from an RTC collection, while item metadata says `productType=GRD` and `processingLevel=1`. RTC products are derived from GRD source products; these fields can describe different processing stages. The draft flags ambiguity but does not separate the source GRD identifier/metadata from the RTC collection item/product. | Define which fields describe the RTC measurement asset and which describe its input GRD source product. Preserve both when metadata supplies them. Until confirmed, present catalog fields verbatim and avoid a simplified “Level-1 RTC” product label. |
| No per-sensor request or date-range context is defined. | The prior `DATA_CONTRACTS.md` defines inclusive `startDate`/`endDate` and NDVI selection; the new response has no request shape, echoed range, or mission-selection semantics. A frontend cannot know whether absent dates mean no matching acquisition, outside the query window, or not requested unless it separately retains request state. | Define transport-neutral request intent (parcel, inclusive dates, selected mission/measurement set) and decide whether the response echoes it. If one response is single-mission, make that invariant explicit. Keep route/method deferred if desired. |
| Replacement is breaking but no migration/version policy is set. | The old NDVI contract requires top-level `index`, `unit`, date range, `provenance`, and observation `observationId`, `acquisitionId`, `observationDate`, singular `value` and `quality`. The draft replaces those with `measurements[]`, source product-key identity and `contractVersion`; it omits some fields and changes where unit/provenance live. The draft itself says it may replace the canonical contract after review. | Record this as an intentional semantic-contract revision, document old-to-new mapping and any fields deliberately retired, and decide versioning before implementation. There is no implemented API/frontend model today, so there is no deployed runtime payload to preserve, but teams working from `DATA_CONTRACTS.md` need one coordinated source of truth. |
| S1 upstream processing provenance is not sufficiently separated from parcel summary processing. | The draft's S1 `processing` describes parcel filtering/aggregation and `additionalSpeckleOrQualityFiltering=false`; it does not capture the upstream RTC process/version/DEM. The data-access workflow did not apply RTC itself; it reads an RTC asset. Product documentation describes RTC as derived from GRD, with calibration/terrain-related processing. The field could be mistaken for “no speckle/terrain processing occurred at all.” | Separate source-product processing lineage from this application's parcel-summary method. Phrase the no-additional-filter statement as applying only to the parcel-summary workflow; retain provider RTC processing provenance or link its documentation when known. |
| S2 processing example omits the actual SCL quality-grid CRS, although it includes the transform. | The result JSON records `scl_crs=EPSG:32629` and `scl_transform`; the draft says retain the SCL grid/transform but its `qualityLayer` example contains only resolution and transform. A transform without CRS is incomplete spatial metadata. | Include the SCL grid CRS with its transform (or represent a complete nested grid object). Keep it distinct from the 10 m NDVI analysis grid. |
| The draft's `grid.resolutionM` rule is scoped too broadly. | Both inspected examples use projected EPSG:32629 and metric pixel sizes. The contract says resolution is metres while treating CRS/resolution as common fields; a geographic or non-metric grid could not be represented truthfully in metres. | Either constrain this contract version to projected metric analysis grids and validate that constraint, or include the resolution unit/CRS-unit semantics explicitly. Do not assume metres for future products. |
| `grid.dataType` and `grid.nodataValue` do not say whether they describe source bands or a derived grid. | S1's float32 and nodata metadata describe source Gamma0 COG assets. S2's measurement is derived from scaled red/NIR arrays and output values are aggregated NDVI; its source reflectance dtype/nodata are not serialized in the result JSON. A common grid-level field can therefore refer to different processing stages across the two measurement types. | Define these as source-raster metadata and attach them to each source band/asset, or omit them from the common analysis grid. Keep the derived measurement's spatial grid separate from its input raster encoding. |
| Backend model-to-contract mapping is still missing by design. | The S2 science result is typed dataclasses in Python `snake_case`; the S1 result is a nested dictionary. There is no backend response serializer, OpenAPI schema, or frontend model. The draft specifies field semantics but not a machine-readable schema or validation rules for the tagged unions. | After semantic approval, create one canonical machine-readable schema (as required by `INTEGRATION_GUIDELINES.md`) and derive/validate backend and frontend types against it. Do not implement separate handwritten payload copies. |

### Optional — future improvement

| Finding | Evidence and impact | Suggested follow-up |
|---|---|---|
| Catalog and asset metadata detail could be more structured. | S2 includes band roles, native resolutions, scale/offset and SCL policy; S1 includes raster dtype/nodata and per-polarization grid. The current representation is mostly adequate, but textual limitations/method strings are harder for clients to validate/display consistently. | Once the two implementations are integrated, consider small structured enums/objects for measurement representation and processing checks, while keeping method-specific parameters. Avoid a generic untyped metadata bag. |
| Missing source QA is described only with nullable flags. | `flags: null` correctly means no flag summary is available, but S2 does have an SCL policy and S1's adapter does not apply a separate source QA mask. | Add structured source-QA assessment details only when needed by a real client; retain `null` versus `[]` semantics from `TEAM_CONTRACTS.md`. |

## Field-by-field findings

| Contract area | Validation result | Finding |
|---|---|---|
| Common envelope and multiple measurements | Structurally sound | One product acquisition per observation and multiple measurement records correctly supports S1 VV/VH and avoids joining unequal acquisition dates. Add a per-mission request/result status rule before supporting joint queries. |
| Sensor/platform identity | Supported with clarification | `Sentinel-2` / `sentinel-2c` / `MSI` and `Sentinel-1` / `sentinel-1c` / `C-SAR` are consistent with the inspected outputs/product naming. Field names follow the team's distinction between mission/platform/instrument. |
| Acquisition time | Supported | The draft values exactly match the result instants: S2 `2026-11-01T11:12:11.025Z`; S1 `2026-10-26T06:28:03.879586Z`. UTC normalization preserves the instant. A separate `observationDate` is derivable but its removal from the previous contract is a migration choice. |
| S2 NDVI value and inputs | Supported | `0.368249284984567`, B04/B08, scale `0.0001`, offset `-0.1`, median, SCL 20 m nearest-neighbor and excluded classes match the result and processor. NDVI unit `1` is dimensionless and matches the existing NDVI contract. The thresholds/policy must stay marked provisional. |
| S1 measurement values | Supported | Draft values match the result JSON: VV median `0.12140032649040222`, mean `0.1289640102874149`; VH median `0.016289573162794113`, mean `0.017307163089175116`. `float32` raster, nodata `-32768`, 10 m resolution, EPSG:32629 and geotransforms match per-channel metadata. |
| S1 polarization and representation | Mostly supported | VV/VH are separate and the linear-power representation avoids accidental dB conversion. Use the coefficient/quantity terminology and preserve unit uncertainty as noted above. |
| S1 RTC meaning | Supported with source-level caveat | Copernicus describes S1 RTC as derived from GRD and gamma0 terrain-corrected/orthorectified; Microsoft's RTC dataset methodology likewise distinguishes GRD input from RTC output. Thus RTC vs GRD/Level-1 fields are not necessarily contradictory, but their provenance roles must be represented distinctly. |
| Pixel counts and coverage | Supported | Both outputs give 22 total and 22 valid pixels per applicable grid/channel and fraction `1.0`. The scientific processors count pixel centers inside the parcel and aggregate valid samples. S1's counts must remain per polarization/statistic group; S2 counts describe the 10 m reflectance/NDVI grid after SCL filtering. |
| Quality status and flags | Mostly supported | S2 accepted/reasons/counts match the output and its thresholds passed. S1's accepted status is only acceptance under finite/nonnegative/nodata filtering, not an independently validated result; the draft states this distinction. `flags: null` is appropriate where the output does not serialize a flag summary. |
| Source IDs/provenance | Incomplete | S2 source product ID/version/date are represented, but mirror item/provider is omitted. S1 item ID is present but the different `productIdentifier` is dropped. Product ID roles must be explicit. |
| CRS/resolution/grid | Supported for current examples | The examples' analysis grids are EPSG:32629, 10 m x 10 m, with GDAL transforms matching outputs. S2 SCL is EPSG:32629 on a separate 20 m grid; include its CRS beside its transform. Avoid implying all possible grids are measured in metres. |
| Parcel geometry/reference | Acceptable for a response that joins a separate parcel resource | Both source result files contain only parcel ID, not geometry. The draft's separate parcel feature reference is consistent with the prior GeoJSON contract, provided the API actually supplies that feature/geometry and its source reference to consumers. |
| NISAR extension | Correctly deferred | The draft does not invent a NISAR measurement schema and correctly says no real NISAR result was inspected. The generic measurement envelope might later host a verified GCOV measurement, but compatibility is not established by this draft. |

## Scientific and documentation checks

- Official Copernicus Sentinel-2 L2A documentation identifies B04 as red at 10 m, B08 as NIR at 10 m, and SCL at 20 m; it documents optical reflectance as unitless and describes the SCL classes. The draft's band roles/resolution and `unit: "1"` for NDVI are consistent. The exact source scale/offset is confirmed by the inspected Copernicus STAC assets and result JSON, rather than inferred from a generic scaling rule.
- Copernicus documentation describes Sentinel-1 RTC as gamma0 terrain processing/orthorectification and as processed from GRD. This supports separating the RTC product from its GRD input metadata. The inspected result explicitly says the source STAC omits unit/scale/offset, so that limitation remains material even though the adapter labels the values unit `1` and linear.
- The actual S1 STAC item exposes `productType=GRD`, `processingLevel=1`, RTC collection identity, platform, mode, C-band frequency, polarizations, orbit and direction. The draft preserves most sensor metadata but not the distinct original `productIdentifier`.
- Software checks performed for this review: all eight JSON code blocks in the draft parsed successfully. The real numeric values and metadata were compared directly with both result JSON files. No application tests were run because no code was changed.

## Backward-compatibility implications

There is no backend API or frontend result model in the inspected repository, so there is no deployed response to break today. However, `docs/DATA_CONTRACTS.md` is explicitly authoritative for the first workflow and the team integration rules require one source of truth. The draft changes the semantic response from one NDVI `index` and `value` to a measurement array, moves unit/provenance, removes required observation IDs/date-only field, adds sensor-specific structures, and adds a version field. Treat adoption as a coordinated contract revision, not as a compatible drop-in extension. Before implementation, document the field mapping/deprecations and replace/update the authoritative contract in one approved change; update backend/frontend branches together and validate one shared synthetic fixture.

## NISAR extensibility

The draft is appropriately conservative: it defines only inspected S1/S2 measurements and does not claim that NISAR GCOV is compatible. The generic measurement wrapper and sensor-specific detail union offer a possible location for future NISAR fields, but actual GCOV quantity, units, layer/matrix semantics, masks, polarization/channel structure, and provenance must be inspected from a real product first. Do not add a NISAR variant or claim cross-sensor numerical comparability on theoretical grounds.

## Required corrections before approval

1. Separate product catalog item IDs, original product identifiers, and asset/mirror provenance; populate each from actual metadata.
2. Resolve the dual-sensor query/status semantics so missingness is visible per requested mission.
3. Correct the statistic description to cover S2 median and S1 median plus mean, including linear-domain interpretation.
4. Scope S1 gamma-zero quantity/representation/unit wording and its unit-source caveat at measurement level.
5. Distinguish RTC output provenance from source GRD product metadata and clarify upstream versus parcel-summary processing.
6. Include SCL grid CRS, and define the resolution unit/CRS constraints.
7. Decide whether query period/mission selection is part of the request/response contract; document the breaking mapping from the old NDVI contract.
8. After semantic review, create one machine-readable authority and derive backend/frontend schemas and fixtures from it.

## Sources consulted

- [Copernicus Data Space: Sentinel-2 L2A band names, resolutions, units and SCL classes](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html)
- [Copernicus Data Space: Sentinel-1 product and RTC processing options](https://documentation.dataspace.copernicus.eu/Data/Sentinel1.html)
- [Sentinel-1 RTC dataset methodology: GRD inputs and RTC processing lineage](https://sentinel-s1-rtc-indigo-docs.s3-us-west-2.amazonaws.com/methodology.html)

## Final recommendation

**Revise before approval.** The contract architecture is promising and the S2/S1 example values largely match the real outputs, but provenance identity, missing-sensor status, statistical wording, S1 unit qualification, and migration semantics need resolution before backend and frontend implementation rely on it.
