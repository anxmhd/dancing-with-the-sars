# First-workflow data contracts

## Purpose and authority

This document is the shared **semantic** contract for the first workflow: select one agricultural parcel and inspect its Sentinel-2 NDVI history. It defines the minimum meaning and shape of exchanged information, not endpoint paths, storage models, or provider-specific raster formats. Until a machine-readable API contract is approved, frontend mocks and backend/science interfaces must conform to these meanings. Before API implementation, select one authoritative machine-readable contract (OpenAPI if an HTTP API is used) and derive or validate consumer types and fixtures from it rather than maintaining competing copies.

All JSON property names use `camelCase`. JSON cannot carry NaN or infinity; numeric values must be finite. Optional-but-nullable fields are included as `null` when the shape requires an explicit unknown. A missing field means the field is not part of the applicable representation; it must not be used to hide missing measurements.

## Geographic feature

Geographic features exchanged through the API use GeoJSON (RFC 7946) with WGS 84 longitude/latitude coordinate order. Geometry is an API representation, not a raw raster or source-file representation. Do not include sample coordinates in this document; actual geometry must come from an inspected source. GeoJSON `type`, `geometry`, `properties`, and `features` retain their standard lowercase names.

The parcel collection is a GeoJSON `FeatureCollection`; each item is a GeoJSON `Feature`. The feature `id` is the internal `parcelId`, and `properties.parcelId` repeats that ID for straightforward consumers.

| GeoJSON field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `type` (collection) | string literal | yes | no | GeoJSON collection discriminator; exactly `FeatureCollection`. | — | `FeatureCollection` |
| `features` | array of Parcel Features | yes | no | Parcel features visible to the selected study-area context. | — | Array with one synthetic feature. |
| `type` (feature) | string literal | yes | no | GeoJSON feature discriminator; exactly `Feature`. | — | `Feature` |
| `id` | string | yes | no | Same opaque internal ID as `properties.parcelId`. | — | `synthetic-parcel-001` |
| `geometry` | GeoJSON `Polygon` or `MultiPolygon` | yes | no | WGS 84 geometry obtained from an approved source. | degrees, longitude then latitude | Omitted; no coordinates are fabricated here. |
| `properties` | object | yes | no | Parcel properties defined below. | — | Synthetic parcel properties below. |

### Parcel feature properties

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `parcelId` | string | yes | no | Opaque internal application ID; stable within this application. | — | `synthetic-parcel-001` |
| `studyAreaId` | string | yes | no | Opaque internal ID of the selected study area context. | — | `synthetic-study-area-001` |
| `sourceRef` | object | yes | no | Namespaced provenance for the source record; never substitute it for `parcelId`. | — | See source-reference fields below. |
| `label` | string | no | yes | Display label only, if supplied/approved by source mapping. | — | `Synthetic parcel` |
| `referenceDate` | string, ISO date | no | yes | Date the source parcel attributes refer to, when known. | — | `2025-01-01` (synthetic) |

The GeoJSON `Feature.id` must equal the internal `parcelId`. `geometry` is a valid `Polygon` or `MultiPolygon` from an approved source; no geometry is fabricated for examples. Source attributes such as crop or irrigation class are intentionally excluded until their meaning, dates, and license are inspected.

### Source reference

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `provider` | string | yes | no | Verified source/provider namespace. | — | `Synthetic source` |
| `externalDatasetId` | string | yes | yes | Provider's external dataset/collection identifier, if verified. | — | `null` in synthetic example |
| `externalRecordId` | string | yes | yes | Provider's external parcel/record identifier, if supplied. | — | `null` in synthetic example |

Examples in tables and below are **synthetic only**, are not Haouz data, and must not be used as source identifiers or measurements.

## Parcel selection

Selection is user/application state. It does not require a separate server-side entity or endpoint. The minimum request intent for a time series consists of:

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `parcelId` | string | yes | no | Internal ID from the parcel feature previously supplied to the user. | — | `synthetic-parcel-001` |
| `startDate` | string, ISO 8601 date (`YYYY-MM-DD`) | yes | no | Inclusive first requested calendar date. | — | `2025-01-01` (synthetic) |
| `endDate` | string, ISO 8601 date (`YYYY-MM-DD`) | yes | no | Inclusive last requested calendar date; must not precede `startDate`. | — | `2025-03-31` (synthetic) |
| `index` | string enum | yes | no | Requested derived index. First workflow supports `NDVI` only. | — | `NDVI` |

No route, HTTP method, or query encoding is finalized here. The backend must reject malformed dates, reversed ranges, unsupported indices, and unknown internal parcel IDs with documented error responses.

## Backend-to-scientific interface

This is an internal Python boundary, not an HTTP payload. Use Python `snake_case` names and typed domain values. Do not serialize raw rasters, arrays, or provider files as API JSON. The backend application passes the selected parcel and request intent to a public scientific use case; the scientific package owns product lookup/access and processing behind that interface.

### Request to scientific use case

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `parcel_id` | string | yes | no | Internal parcel ID for result linkage. | — | `synthetic-parcel-001` |
| `parcel_geometry` | geometry object | yes | no | Approved parcel geometry, with CRS supplied separately. | CRS units | Synthetic geometry omitted. |
| `parcel_crs` | CRS identifier string | yes | no | CRS declared by the inspected source/geometry object; never guessed. | — | `synthetic-crs` (placeholder only) |
| `start_date` | Python `date` | yes | no | Inclusive first requested date. | — | `2025-01-01` (synthetic) |
| `end_date` | Python `date` | yes | no | Inclusive final requested date. | — | `2025-03-31` (synthetic) |
| `index` | literal enum | yes | no | Requested calculation. Initially `NDVI` only. | — | `NDVI` |

The internal scientific data-access component resolves approved products and acquisitions and supplies the processor with product-specific reflectance inputs, source QA, nodata/scale metadata, and grid/CRS metadata. Red/NIR roles are required for NDVI; the actual source band identifiers, encoding, scale/offset, mask interpretation, and spatial alignment remain product-specific and must be established by inspection. Do not pass credentials in this interface or let browser input choose arbitrary filesystem paths.

### Result from scientific use case

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `observations` | list of domain `VegetationObservation` values | yes | no | One candidate result per relevant acquisition at the selected product grain; includes explicit quality state. | — | One synthetic observation. |
| `provenance` | domain `DataProvenance` | yes | no | Source and processing lineage for returned results. | — | Synthetic lineage only. |
| `result_status` | enum | yes | no | `available`, `no_observations`, or `no_valid_observations`; maps to the API's camelCase enum values. | — | `available` |

The backend maps this result into the public camelCase response and maps known domain failures to the API error envelope. The scientific package must not import HTTP schemas or know the API route. Product-specific input structures and exact Python type definitions are postponed until a product is selected.

## Vegetation time-series response

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `parcelId` | string | yes | no | Internal selected parcel ID. | — | `synthetic-parcel-001` |
| `index` | string enum | yes | no | Indicator returned; initially `NDVI`. | — | `NDVI` |
| `unit` | string | yes | no | Unit for all values. NDVI is dimensionless; use `1`. | — | `1` |
| `startDate` | string, ISO date | yes | no | Inclusive range start echoed from validated request. | — | `2025-01-01` (synthetic) |
| `endDate` | string, ISO date | yes | no | Inclusive range end echoed from validated request. | — | `2025-03-31` (synthetic) |
| `resultStatus` | string enum | yes | no | `available`, `noObservations`, or `noValidObservations`. | — | `available` |
| `observations` | array of `VegetationObservation` | yes | no | Returned candidate acquisition results in chronological order; empty when none exist. | — | One synthetic observation below. |
| `provenance` | `DataProvenance` | yes | no | Source and processing lineage applicable to this response. | — | See provenance table. |

### Vegetation observation

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `observationId` | string | yes | no | Opaque internal result ID. | — | `synthetic-vegetation-observation-001` |
| `acquisitionId` | string | yes | no | Internal reference to the acquisition candidate. | — | `synthetic-acquisition-001` |
| `acquiredAt` | string, ISO 8601 date-time with offset | no | yes | Acquisition time when source metadata supplies it. Do not invent a time if only a date is known. | — | `2025-01-15T10:30:00Z` (synthetic) |
| `observationDate` | string, ISO date | yes | no | Source acquisition calendar date used to order/label the series. | — | `2025-01-15` (synthetic) |
| `value` | finite number | yes | yes | Parcel-level NDVI output. Number only when quality status is `accepted`; otherwise `null`. | `1` (dimensionless) | `0.42` (synthetic only) |
| `quality` | `DataQuality` | yes | no | Acceptance/exclusion/assessment state for this parcel result. | — | See quality table. |

Do not add unobserved dates as synthetic points. Missing acquisitions are absent from `observations`; gaps remain visible from the dates actually returned. An acquisition candidate excluded by quality remains an observation with `value: null` and its quality outcome/reasons. `noObservations` means the selected range has no matching candidate acquisition records; `noValidObservations` means candidates exist but none has an accepted numeric value.

## Quality contract

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `status` | string enum | yes | no | `accepted`, `excluded`, or `unknown`; status for this parcel-level result, not a general sensor rating. | — | `accepted` |
| `flags` | array of strings | yes | yes | Source/product QA flags preserved or documented normalized flags. `null` means unavailable/unknown; `[]` means flags were assessed and none apply. | — | `[]` |
| `reasons` | array of strings | yes | no | Explanation codes/text for exclusion or unknown status; may be empty for accepted results. | — | `[]` |
| `validPixelCount` | non-negative integer | no | yes | Number of pixels included by the approved aggregation, if meaningful and available. | pixels | `12` (synthetic) |
| `totalPixelCount` | non-negative integer | no | yes | Number of candidate pixels in the parcel for this acquisition, if meaningful and available. | pixels | `15` (synthetic) |

The aggregation statistic and any threshold policy are unresolved. Do not return pixel counts unless their exact meaning is documented. A null count means unavailable/unknown, never zero. Zero means measured/processed count is actually zero. Source QA flags and derived quality status must retain their distinction.

`accepted` means every quality check required by the approved method was actually evaluable and passed. If required QA information is missing or the policy has not been applied, use `unknown` (with a null value), not `accepted`.

## Provenance contract

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `provider` | string | yes | no | Verified source/provider name. | — | `Synthetic source` |
| `datasetName` | string | yes | no | Human-readable dataset/collection name. | — | `Synthetic dataset` |
| `externalDatasetId` | string | no | yes | Provider's collection identifier, if known. | — | `null` in synthetic example |
| `externalProductIds` | array of strings | yes | yes | Provider product identifiers actually used. `null` means not available/known; an array contains only identifiers actually supplied by the provider. | — | `null` in synthetic example |
| `externalAcquisitionIds` | array of strings | yes | yes | Provider acquisition identifiers, when supplied. `null` means not available/known. | — | `null` in synthetic example |
| `productVersion` | string | no | yes | Product version/processing level as provided. | — | `null` in synthetic example |
| `processingSoftware` | string | no | yes | Processing implementation and version. | — | `synthetic-processor/0.0` |
| `processingMethod` | string | yes | no | Stable method name/version or human-readable method reference. | — | `NDVI aggregation (synthetic)` |
| `processingParameters` | object | yes | no | Explicit parameters that affect the result; empty only if method requires none. | — | `{}` |
| `processedAt` | string, ISO 8601 date-time with offset | no | yes | Time result was generated, if recorded. | — | `2025-01-16T00:00:00Z` (synthetic) |

Do not expose private filesystem paths, credentials, or raw asset URLs as provenance. Preserve source acquisition references with the observation/acquisition contract when available; never substitute invented product IDs.

## Errors and empty states

An empty result is a valid response, distinct from an error. An unknown parcel, invalid selection, unavailable source, and unexpected processing failure must be distinguishable. Suggested error envelope (exact HTTP status and route mapping are deferred):

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `code` | string | yes | no | Stable machine-readable error code. | — | `INVALID_DATE_RANGE` |
| `message` | string | yes | no | Safe, user-readable summary. | — | `The end date must not precede the start date.` |
| `details` | array of `ErrorDetail` | yes | no | Field-level or source-specific details; empty if none. | — | `[]` |

Each `ErrorDetail` has the following fields:

| Field | Type | Required | Nullable | Meaning | Unit | Example |
|---|---|---:|---:|---|---|---|
| `fieldPath` | string | no | yes | Input field related to the detail, when applicable. | — | `endDate` |
| `code` | string | no | yes | Stable machine-readable detail code, when available. | — | `DATE_ORDER` |
| `message` | string | yes | no | Human-readable explanation of this detail. | — | `End date precedes start date.` |

Example: `{"fieldPath":"endDate","code":"DATE_ORDER","message":"End date precedes start date."}` (synthetic).

The frontend must show loading, valid-empty, no-valid-observation, unavailable-source, and request-error states separately. Never render an error as a zero-valued measurement.

## Synthetic example

This is a shape illustration only. All IDs, dates, processor names, and NDVI values below are fabricated test values, not satellite data or product references.

```json
{
  "parcelId": "synthetic-parcel-001",
  "index": "NDVI",
  "unit": "1",
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "resultStatus": "available",
  "observations": [
    {
      "observationId": "synthetic-vegetation-observation-001",
      "acquisitionId": "synthetic-acquisition-001",
      "acquiredAt": "2025-01-15T10:30:00Z",
      "observationDate": "2025-01-15",
      "value": 0.42,
      "quality": {
        "status": "accepted",
        "flags": [],
        "reasons": [],
        "validPixelCount": 12,
        "totalPixelCount": 15
      }
    }
  ],
  "provenance": {
    "provider": "Synthetic source",
    "datasetName": "Synthetic dataset",
    "externalDatasetId": null,
    "externalProductIds": null,
    "externalAcquisitionIds": null,
    "productVersion": null,
    "processingSoftware": "synthetic-processor/0.0",
    "processingMethod": "NDVI aggregation (synthetic)",
    "processingParameters": {},
    "processedAt": "2025-01-16T00:00:00Z"
  }
}
```

## Contract evolution

Before independent API/frontend implementation, the team must approve this semantic contract and select a canonical machine-readable contract format. Contract changes require review by frontend, backend, and scientific owners before implementation changes. Preserve compatibility or explicitly version breaking changes. Do not finalize endpoint paths, response aggregation, quality thresholds, or source-dependent metadata until product inspection resolves them.
