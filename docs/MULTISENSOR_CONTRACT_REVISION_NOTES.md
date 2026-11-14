# Multisensor contract final revision notes

**Revision date:** 2026-11-14
**Draft revised:** `docs/MULTISENSOR_CONTRACT_DRAFT.md`
**Basis:** Findings in `docs/MULTISENSOR_CONTRACT_REVIEW.md` and the two existing real CLI result artifacts.
**Scope:** Documentation only. No authoritative contract or application code was changed.

## Finding-by-finding resolution

### Critical findings

| Review finding | Resolution in final draft | Status |
|---|---|---|
| S1 catalog item ID and reported product identifier were conflated; the distinct `productIdentifier` was lost. | The source shape now has distinct `catalogItemId` and nullable `sourceProductIdentifier`. The S1 example preserves catalog item `...0140FD_rtc` separately from reported product identifier `...0140FD_DEAB`. The stable client key is `(catalogProvider, catalogItemId)`. | Resolved |
| S2 catalog/product provider and raster mirror provenance were conflated; mirror was omitted. | `source.catalogProvider`/catalog item describe product metadata. `source.assetSource` describes the provider, collection and item from which pixel assets were read. The S2 example records Copernicus source item and the Microsoft Planetary Computer mirror item separately. No signed asset URLs are exposed. | Resolved |
| Combined query status could hide a requested sensor with no acquisition or an unavailable source. | The response echoes `query.requestedMissions` and has exactly one `sensorResults` entry per requested mission. Each entry has `available`, `noObservations`, `noValidObservations`, or `unavailable` status and an observation count. Unrequested missions are omitted. | Resolved |
| Statistic prose contradicted examples by saying both outputs were median while S1 also provided means. | `statistic` is explicitly `median` or `mean`. The draft states S2 NDVI is median and S1 has median and arithmetic mean for both VV and VH. Each statistic is a distinct measurement tuple, and the S1 means are explicitly on the stored linear-value scale. | Resolved |

### Important findings

| Review finding | Resolution or documented limitation | Status |
|---|---|---|
| S1 unit was not declared in STAC; adapter supplied `1`. | Each measurement carries `unitStatus`. S1 uses `unit="1"`, `unitStatus="adapterDeclaredSourceUnspecified"`, `representation="linearPower"`, and a limitation stating STAC omits unit, scale and offset. The adapter's declaration is not presented as source-verified. | Resolved; source uncertainty retained |
| `gamma0BackscatterPower` risked confusing a coefficient with physical watts. | Quantity is now `gamma0BackscatterCoefficient` (γ⁰); `representation="linearPower"` separately describes stored numerical representation. The draft says values are not dB and not direct soil-moisture/stress measurements. | Resolved |
| RTC collection and GRD/Level-1 metadata were not assigned to distinct provenance roles. | Catalog item, separate reported product identifier, collection, product type and level are retained as separate verbatim values. The S1 `sourceProcessingNote` explicitly says the result does not establish which processing stage `productType=GRD`/`processingLevel=1` describes. No normalized “Level-1 RTC” label is inferred. | Resolved; stage relationship remains explicitly unknown |
| Request mission and inclusive date range were absent. | `query` carries required inclusive `startDate`, `endDate`, and `requestedMissions`; each mission has its own status. The CLI artifacts do not record query bounds, so examples clearly label their one-day date ranges as illustrative API request inputs, not source metadata. | Resolved; query bounds are not inferred from the CLI artifacts |
| Replacement of the NDVI contract had no migration/version strategy. | A migration table maps parcel, date range, NDVI quantity/unit/value, status, dates/acquisition, quality and provenance into the new structure. The draft identifies `1.0` as the first proposed wire-contract version and the old document as a pre-implementation semantic contract. Because no API or frontend result model is implemented, adoption is an atomic pre-release change; no dual payload or live compatibility shim is needed. | Resolved |
| S1 parcel-summary filtering could be mistaken for upstream RTC processing. | S1 `processing` is explicitly scoped to parcel summary; `additionalParcelSummaryFiltering=false` is defined as no extra parcel-stage filter beyond listed value validity exclusions. Upstream RTC processor version/DEM are not in the result and remain unknown in `sourceProcessingNote`; the draft forbids filling them from unrelated product documentation. | Resolved; unavailable upstream details remain null/documented |
| S2 SCL transform lacked its CRS. | S2 `qualityLayer.grid` now includes `crs=EPSG:32629` with the separate 20 m SCL GDAL transform, distinct from the 10 m NDVI grid. | Resolved |
| `resolutionM` assumed all sensor grids are metric. | Measurement grids now have `resolution` and explicit `resolutionUnit`. The current examples use metres in EPSG:32629; the draft warns not to assume metres for a different CRS and requires unknown values to remain null. | Resolved for supported examples; future CRS units remain product-dependent |
| Raster dtype/nodata fields ambiguously described source assets or derived measurement grids. | Those fields were removed from the common spatial grid and placed under source-band metadata (`dataType`/`nodataValue`) or `processing.sourceRaster`. S2 result artifact omits those values, so its example uses null; S1 includes float32 and nodata -32768. | Resolved |
| No machine-readable validation schema existed. | The document remains a semantic contract draft for owner approval. Per the existing integration guidance, the approved semantic shape will be made the sole authority and encoded in OpenAPI/derived consumer schemas during implementation. This is a deliberate approval-to-implementation step, not a second schema or blocker to semantic approval. | Resolved for this approval stage |

### Optional findings

| Review finding | Resolution | Status |
|---|---|---|
| Method and catalog metadata could be more structured than strings. | Kept only the currently supported sensor-specific fields, method parameters, source catalog identity and asset-source identity. Additional normalization is deferred unless implementation reveals a concrete consumer need. This avoids speculative abstraction. | Deferred optional improvement |
| Source QA flags may not be summarized. | `flags=null` continues to mean unavailable/not summarized; `[]` means assessed and none apply. S2 SCL exclusions and counts remain explicit; S1 does not claim a separate source QA flag summary. | Resolved with explicit existing semantics |

## Evidence checks against real artifacts

| Data | Draft values and metadata checked against source JSON |
|---|---|
| Sentinel-2 | Catalog item `S2C_MSIL2A_20261101T111211_N0513_R137_T29SPR_20261102T152046`; product URI; mirror item `S2C_MSIL2A_20261101T111211_R137_T29SPR_20261102T152046`; platform; acquisition instant/date; processing version; orbit/tile/cloud-cover; B04/B08/SCL source asset identifiers, resolutions, scales/offsets and SCL resampling; 10 m EPSG:32629 transform; separate 20 m EPSG:32629 SCL transform; median NDVI `0.368249284984567`; quality accepted; 22 valid/22 total, fraction 1.0 and excluded SCL count 0; provisional thresholds/exclusions. |
| Sentinel-1 | Catalog item `S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc`; distinct reported product identifier `S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_DEAB`; acquisition/processing instants; platform, product type/level, IW mode, C-band/frequency, VV/VH, orbit/direction; per-channel EPSG:32629, 10 m, GDAL transform, float32/nodata -32768; VV median `0.12140032649040222`, mean `0.1289640102874149`; VH median `0.016289573162794113`, mean `0.017307163089175116`; 22 valid/22 total and fraction 1.0 for each channel/statistic. |

The S2 artifact does not serialize reflectance source dtype/nodata, so those example fields are null. S1 STAC does not supply measurement unit, scale/offset, or upstream RTC processor/DEM; the draft preserves the adapter's stated linear `1` convention with an explicit unverified-source status and does not invent upstream processing details. The S1 RTC collection/item's `productType`/`processingLevel` stage relationship remains explicitly uncertain. NISAR remains unverified and outside this contract revision until an actual product is processed.

## Checks run

- Parsed every fenced JSON block in `docs/MULTISENSOR_CONTRACT_DRAFT.md` with Python's JSON parser.
- Compared example timestamps as instants, source identifiers, metadata, values, counts, and grid fields directly to the corresponding result JSON files.
- Checked markdown files for trailing whitespace and ran `git diff --check` on tracked changes. No application tests were run; no application code changed.

## Completion recommendation

**READY FOR OWNER APPROVAL.** The critical findings are resolved, important uncertainties are carried explicitly, and the examples preserve the available S1/S2 evidence. The three owners can approve this semantic contract and proceed to the single machine-readable schema and implementation integration. No NISAR semantics are claimed.
