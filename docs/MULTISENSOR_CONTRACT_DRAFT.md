> **Historical document ? superseded.** This file records an earlier audit/draft stage and is retained for decision history. The current contract authority is `contracts/multisensor-response.schema.json`; implementation guidance is in `docs/IMPLEMENTATION_GUIDE.md`.

# Multisensor parcel observation contract (draft)

**Status:** Final draft for backend, frontend, and scientific-owner approval. This document does not replace `DATA_CONTRACTS.md` until all owners approve it.

**Scope:** One parcel and one or more Sentinel-2 MSI NDVI and/or Sentinel-1 RTC VV/VH observations. It is based on the two inspected result artifacts. It does not define NISAR; no actual NISAR result has been inspected.

## Design rules

1. The outer response describes parcel and result state; each observation describes one product acquisition.
2. Each observation contains one or more explicitly defined measurements. NDVI, Sentinel-1 VV, and Sentinel-1 VH remain distinct quantities/channels.
3. Units, representation, spatial grid, quality/coverage, method, and source provenance accompany the measurement they describe.
4. A usable computed value is not a claim of scientific validation, crop health, vegetation stress, soil moisture, or causation.
5. JSON field names are `camelCase`; dates are ISO 8601; instants include a UTC offset; numeric values are finite. Unknown optional values use `null`. Missing measurements are not encoded as zero.
6. A parcel is referenced by `parcelId`; its approved GeoJSON geometry and parcel source reference are supplied separately by the parcel feature. Do not duplicate geometry in every observation.

## Response envelope

```json
{
  "contractVersion": "1.0",
  "parcelId": "string",
  "query": {
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "requestedMissions": ["Sentinel-2", "Sentinel-1"]
  },
  "sensorResults": [
    { "mission": "Sentinel-2", "status": "noObservations", "observationCount": 0 },
    { "mission": "Sentinel-1", "status": "unavailable", "observationCount": 0 }
  ],
  "observations": []
}
```

This envelope snippet is a shape illustration. The real-output examples below use the actual acquisition dates; their one-day query ranges are explicitly identified as example request inputs, not fields recovered from the CLI artifacts.

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `contractVersion` | string | yes | Version of this response contract. |
| `parcelId` | string | yes | Stable application parcel identifier; joins to the parcel feature. |
| `query` | object | yes | Echo of the validated request: inclusive `startDate`, `endDate`, and `requestedMissions`. |
| `sensorResults` | array | yes | Exactly one status entry for every requested mission, including missions with no results. |
| `observations` | array | yes | Product acquisitions in chronological order across requested missions. Empty when every requested mission has no observations or is unavailable. |

`query.startDate` and `query.endDate` are inclusive ISO dates and must echo the validated request. `requestedMissions` contains one or both of `Sentinel-2` and `Sentinel-1`; an unrequested mission must not appear in `sensorResults`.

| Query field | Type | Required | Meaning |
|---|---|---:|---|
| `startDate` | ISO date | yes | Inclusive first requested date. |
| `endDate` | ISO date | yes | Inclusive last requested date; not before `startDate`. |
| `requestedMissions` | nonempty array of mission enum | yes | `Sentinel-2`, `Sentinel-1`, or both. |

Each `sensorResults` entry has `mission`, `status`, and `observationCount`. `status` is `available`, `noObservations`, `noValidObservations`, or `unavailable`. `available` means query execution completed and at least one returned measurement has an accepted numeric value. `unavailable` means the requested catalog/assets could not be queried; it must not be reported as `noObservations`. `noValidObservations` means candidate acquisition(s) exist but none has an accepted numeric measurement. An acquisition count includes observations even if some or all of their measurements are excluded/unknown. Do not synthesize observations for dates with no acquisition. If querying both missions, include each acquisition separately; do not join different acquisition dates into a synthetic paired record. Per-mission status makes missingness visible when only one sensor has observations.

| Sensor result field | Type | Required | Meaning |
|---|---|---:|---|
| `mission` | mission enum | yes | One requested mission, present exactly once per requested mission. |
| `status` | enum | yes | `available`, `noObservations`, `noValidObservations`, or `unavailable`, with meanings above. |
| `observationCount` | nonnegative integer | yes | Number of returned acquisition observations for this mission. |

## Observation envelope

```json
{
  "acquiredAt": "2026-11-01T11:12:11.025Z",
  "observationDate": "2026-11-01",
  "mission": "Sentinel-2",
  "platform": "sentinel-2c",
  "instrument": "MSI",
  "sensorDetails": {},
  "source": {},
  "measurements": [],
  "limitations": []
}
```

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `acquiredAt` | ISO 8601 instant | yes | Source acquisition instant. Do not replace with processing time. |
| `observationDate` | ISO date | yes | Acquisition calendar date in UTC, derived from `acquiredAt`; it preserves the existing NDVI consumer field. |
| `mission` | enum/string | yes | Mission name, currently `Sentinel-2` or `Sentinel-1`. |
| `platform` | string | yes | Platform value supplied by product metadata, e.g. `sentinel-2c`. |
| `instrument` | string | yes | Instrument name supplied/identified for the mission: `MSI` or `C-SAR`. |
| `sensorDetails` | sensor-specific object | yes | Product/acquisition metadata that differs by mission, defined below. This is a discriminated shape, not an untyped metadata bag. |
| `source` | object | yes | Product and provider provenance below. |
| `measurements` | array | yes | Sensor-specific measurements for this acquisition. |
| `limitations` | array of strings | yes | Important interpretation or source-metadata limitations applicable to this observation. Empty only when reviewed and none apply. |

The stable observation key for clients is the tuple `(source.catalogProvider, source.catalogItemId)`. `sourceProductIdentifier` remains a separate provenance value and must not replace the catalog item key. No internal opaque observation ID is required by this draft because none exists in the current CLI results.

## Source provenance

```json
{
  "catalogProvider": "string",
  "dataset": "string",
  "collectionId": "string",
  "catalogItemId": "string",
  "catalogUrl": "https://...",
  "sourceProductIdentifier": null,
  "productUri": null,
  "processingVersion": null,
  "processingDateTime": null,
  "productType": null,
  "processingLevel": null,
  "assetSource": {
    "provider": "string",
    "collectionId": "string",
    "itemId": "string"
  },
  "sourceProcessingNote": null
}
```

`catalogProvider` identifies the catalog record used for product metadata. `catalogItemId` and `catalogUrl` identify that exact catalog item. `sourceProductIdentifier` is a distinct provider product identifier when present; do not conflate it with the catalog item's ID. `assetSource` identifies where the raster asset bytes were read from, even when the product catalog is a different provider. If both roles share the same provider/item, repeat that exact source in both fields. Do not serialize temporary signed asset URLs, local paths, or credentials. Unknown metadata is `null`, never inferred.

`productType` and `processingLevel` preserve the catalog item's verbatim values. For the inspected S1 item, the RTC collection item reports `productType=GRD` and `processingLevel=1`; this draft preserves them without asserting which processing stage those properties describe. `sourceProcessingNote` carries the explicit limitation when the catalog does not establish the relationship or upstream RTC processor details.

| Source field | Type | Required | Meaning |
|---|---|---:|---|
| `catalogProvider` | string | yes | Provider/source namespace for catalog metadata. |
| `dataset` | string | yes | Human-readable product description. |
| `collectionId` | string or null | yes | Provider collection identifier. |
| `catalogItemId` | string | yes | Exact catalog STAC item ID. |
| `catalogUrl` | URI string or null | yes | Stable catalog record URL, if available; never a signed asset URL. |
| `sourceProductIdentifier` | string or null | yes | Separate product identifier supplied by catalog metadata, when available. |
| `productUri` | string or null | yes | Product URI if the source exposes one. |
| `processingVersion` | string or null | yes | Source product processing version/baseline, not application software version. |
| `processingDateTime` | ISO 8601 instant or null | yes | Product processing time if provided. |
| `productType` | string or null | yes | Verbatim source value if available. |
| `processingLevel` | string or null | yes | Verbatim source value if available; do not derive from product naming. |
| `assetSource` | object | yes | Pixel asset provider and item actually read; no signed hrefs. |
| `sourceProcessingNote` | string or null | yes | Explicit uncertainty about source processing lineage, if metadata does not establish it. |

`assetSource` fields are `provider` (required string), `collectionId` (required string or null), and `itemId` (required string or null). `sourceProcessingNote` must not be used to repeat known values; use the typed source fields for those.

The `sensorDetails` object is a tagged union selected by `mission`:

| Mission | Fields and types |
|---|---|
| `Sentinel-2` | `relativeOrbit: integer or null`; `mgrsTile: string or null`; `tileCloudCoverPercent: finite number or null`. |
| `Sentinel-1` | `instrumentMode: string or null`; `frequencyBand: string or null`; `centerFrequencyGHz: finite number or null`; `polarizations: array of strings`; `relativeOrbit: integer or null`; `orbitState: string or null`; `observationDirection: string or null`. |

## Measurement union

Every measurement has this common shape:

```json
{
  "quantity": "NDVI",
  "representation": "index",
  "value": 0.368249284984567,
  "unit": "1",
  "unitStatus": "definedByQuantity",
  "statistic": "median",
  "grid": {
    "crs": "EPSG:32629",
    "resolution": [10, 10],
    "resolutionUnit": "m",
    "transformGdal": [623070, 10, 0, 3503690, 0, -10]
  },
  "quality": {
    "status": "accepted",
    "flags": null,
    "reasons": [],
    "validPixelCount": 22,
    "totalPixelCount": 22,
    "validPixelFraction": 1.0,
    "excludedPixelCount": null
  },
  "processing": {}
}
```

Common fields:

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `quantity` | discriminant | yes | `NDVI` or `gamma0BackscatterCoefficient`. It names the actual derived/represented quantity, not an interpretation. |
| `representation` | enum | yes | `index` for NDVI; `linearPower` for the S1 gamma-zero coefficient values as stored. This describes numeric representation, not physical units. |
| `value` | finite number or null | yes | Parcel summary. Must be `null` when quality status is `excluded` or `unknown`. |
| `unit` | string | yes | Unit of the reported numeric representation. `1` is dimensionless. |
| `unitStatus` | enum | yes | `definedByQuantity` (e.g. NDVI unit 1) or `adapterDeclaredSourceUnspecified` (S1 unit 1 is declared by the adapter while source STAC omits unit/scale/offset). |
| `statistic` | enum | yes | `median` or `mean`. Current S2 result supplies median NDVI. Current S1 result supplies both median and arithmetic mean for VV and VH, each on the stored linear-value scale. |
| `grid` | object | yes | Analysis raster `crs`, `[x,y]` resolution, explicit `resolutionUnit`, and six-number GDAL transform `[xOrigin,pixelWidth,rowRotation,yOrigin,columnRotation,pixelHeight]`. This describes the measurement grid. Source encoding/nodata belong in `processing.sourceRaster`, not here. |
| `quality` | object | yes | Measurement-specific quality and coverage, defined below. |
| `processing` | object | yes | Sensor-specific inputs and parcel-summary method. `sourceRaster` fields, when available, describe source encoding and are not output scalar types. |

For `grid`, `resolution` is `[x,y]` and `resolutionUnit` names its units. The currently supported examples use projected CRS EPSG:32629 and `resolutionUnit="m"`. Do not assume metres for a different CRS; unknown CRS/resolution details are null, or extend the unit rule only with a verified product.

For `processing.sourceRaster`, `dataType` is a string or null and `nodataValue` is a finite number or null. These refer to the actual source raster asset. The S2 artifact does not serialize these fields, so the example uses null; the S1 artifact reports float32 and nodata -32768 for both channels.

The tuple `(quantity, polarization when present, statistic)` identifies one measurement within an observation and must be unique. For NDVI, polarization is not present. S2 NDVI uses `median` here; S1 VV/VH each include `median` and `mean`. A consumer must display the statistic. Do not compare S1 linear mean/median with dB statistics or with NDVI values.

### Sentinel-2 NDVI measurement

When `quantity` is `NDVI`, the following fields are required in `processing`:

```json
{
  "method": "sentinel-2-parcel-ndvi-provisional-v1",
  "bands": {
    "red": { "asset": "B04", "sourceAsset": "B04_10m", "resolutionM": 10, "scale": 0.0001, "offset": -0.1, "dataType": null, "nodataValue": null },
    "nir": { "asset": "B08", "sourceAsset": "B08_10m", "resolutionM": 10, "scale": 0.0001, "offset": -0.1, "dataType": null, "nodataValue": null }
  },
  "qualityLayer": {
    "asset": "SCL",
    "sourceAsset": "SCL_20m",
    "resolutionM": 20,
    "grid": {
      "crs": "EPSG:32629",
      "transformGdal": [623060, 20, 0, 3503700, 0, -20]
    },
    "resampling": "nearest",
    "excludedClasses": [0, 1, 3, 8, 9, 10, 11],
    "retainedClassesNote": "SCL classes 2 and 7 are retained."
  },
  "pixelInclusion": "pixel center",
  "minimumValidPixels": 5,
  "minimumValidFraction": 0.5
}
```

The S2 processing values above describe the current provisional workflow, not approved production defaults or validated cloud-screening policy. Do not drop scale/offset or band roles when serializing an NDVI result.

| S2 processing field | Type | Required | Meaning |
|---|---|---:|---|
| `asset` | string | yes | Logical band role (`B04`, `B08`, or `SCL`). |
| `sourceAsset` | string | yes | Exact source catalog asset key read by the adapter. |
| `resolutionM` | positive number | yes | Native source band resolution in metres. |
| `scale`, `offset` | finite number | for B04/B08 | Source reflectance calibration from inspected STAC metadata. SCL is categorical and has no reflectance scale/offset. |
| `dataType`, `nodataValue` | string/finite number or null | yes | Source encoding metadata if present in the result artifact; otherwise null. |

For Sentinel-2, `sensorDetails` contains `relativeOrbit`, `mgrsTile`, and `tileCloudCoverPercent`, preserving the values when present in source metadata and using `null` otherwise. SCL has its own source grid (20 m and its source transform); preserve that in `processing.qualityLayer` using `transformGdal` when available. Its categorical grid is not the NDVI analysis grid.

### Sentinel-1 RTC measurement

When `quantity` is `gamma0BackscatterCoefficient`, each polarization is a separate measurement and requires:

```json
{
  "quantity": "gamma0BackscatterCoefficient",
  "polarization": "VV",
  "representation": "linearPower",
  "value": 0.12140032649040222,
  "unit": "1",
  "unitStatus": "adapterDeclaredSourceUnspecified",
  "statistic": "median",
  "grid": {
    "crs": "EPSG:32629",
    "resolution": [10, 10],
    "resolutionUnit": "m",
    "transformGdal": [623070, 10, 0, 3503690, 0, -10]
  },
  "quality": {
    "status": "accepted",
    "flags": null,
    "reasons": [],
    "validPixelCount": 22,
    "totalPixelCount": 22,
    "validPixelFraction": 1.0,
    "excludedPixelCount": null
  },
  "processing": {
    "method": "median of finite, nonnegative, non-nodata parcel pixels",
    "pixelInclusion": "pixel center",
    "excludedValues": ["product nodata", "nonfinite", "negative"],
    "additionalParcelSummaryFiltering": false,
    "sourceRaster": { "dataType": "float32", "nodataValue": -32768 }
  }
}
```

`polarization` is `VV` or `VH`. `quantity` names the normalized gamma-zero backscatter coefficient (γ⁰); `representation=linearPower` says the numerical values are stored on a linear scale, not dB. The result adapter declares `unit="1"`, while STAC omits unit, scale, and offset. Therefore `unitStatus` must be `adapterDeclaredSourceUnspecified`; preserve this limitation beside each measurement and do not present the unit as independently source-verified. `additionalParcelSummaryFiltering=false` means this parcel-summary step added no filtering beyond its listed finite/nodata/nonnegative validity exclusions; it says nothing about upstream RTC processing. Do not imply that these values are direct soil-moisture or vegetation-stress measurements.

For Sentinel-1, `sensorDetails` contains `instrumentMode`, `frequencyBand`, `centerFrequencyGHz`, `polarizations`, `relativeOrbit`, `orbitState`, and `observationDirection`, preserving source values. Each polarization measurement's `processing.sourceRaster` carries the source raster `dataType` and `nodataValue`; these are source asset encoding metadata, not the scalar summary's data type.

| S1 processing field | Type | Required | Meaning |
|---|---|---:|---|
| `method` | string | yes | Human-readable parcel aggregation method for the stated statistic; it is not an independently versioned upstream RTC processor identifier. |
| `pixelInclusion` | string enum | yes | Parcel inclusion rule; current workflow uses `pixel center`. |
| `excludedValues` | array of strings | yes | Current parcel-stage exclusions: product nodata, nonfinite and negative values. |
| `additionalParcelSummaryFiltering` | boolean | yes | Whether this parcel summary adds filtering beyond `excludedValues`; does not describe upstream source-product processing. |
| `sourceRaster.dataType` | string or null | yes | Source asset raster encoding type. |
| `sourceRaster.nodataValue` | finite number or null | yes | Source asset nodata value. |

### Quality and coverage

| Field | Type | Required | Meaning |
|---|---|---:|---|
| `status` | enum | yes | `accepted`, `excluded`, or `unknown`. This is the outcome of the stated computational quality policy, not scientific validation. |
| `flags` | array of strings or null | yes | Source/normalized flags when available. `null` means unavailable or not summarized; `[]` means assessed and none apply. |
| `reasons` | array of strings | yes | Explicit exclusion or unknown reasons; empty for accepted. |
| `validPixelCount` | nonnegative integer or null | yes | Pixels used by this measurement's aggregation. |
| `totalPixelCount` | nonnegative integer or null | yes | Candidate pixel centers inside the parcel on this measurement's analysis grid. |
| `validPixelFraction` | number in `[0,1]` or null | yes | Valid / total coverage for this measurement. `null` if counts cannot establish it. |
| `excludedPixelCount` | nonnegative integer or null | yes | Pixels excluded by a named source QA policy, when the workflow reports the count; `null` if not reported or not separately counted. |

Counts, fraction, quality, and grid belong to each measurement. This is necessary because separate bands/polarizations can have different grids, coverage, or quality. An accepted measurement means only that all checks declared by its implemented method passed; it does not establish independent accuracy or ground validation.

## Real-output examples

These examples use the inspected real CLI values and IDs. They demonstrate contract mapping, not scientific validation. `limitations` records the known caveats. The backend must use the source catalog data and processing output as the source of values; do not hardcode these examples as live results.

### Sentinel-2 example

The CLI artifact does not record a requested date range. This example uses a one-day API request for the acquisition date solely to demonstrate the response shape; it is not metadata inferred from the CLI file.

```json
{
  "contractVersion": "1.0",
  "parcelId": "el haouz_Trees_20240110_036",
  "query": {
    "startDate": "2026-11-01",
    "endDate": "2026-11-01",
    "requestedMissions": ["Sentinel-2"]
  },
  "sensorResults": [
    { "mission": "Sentinel-2", "status": "available", "observationCount": 1 }
  ],
  "observations": [
    {
      "acquiredAt": "2026-11-01T11:12:11.025Z",
      "observationDate": "2026-11-01",
      "mission": "Sentinel-2",
      "platform": "sentinel-2c",
      "instrument": "MSI",
      "sensorDetails": { "relativeOrbit": 137, "mgrsTile": "29SPR", "tileCloudCoverPercent": 0.0 },
      "source": {
        "catalogProvider": "Copernicus Data Space Ecosystem",
        "dataset": "Sentinel-2 MSI Level-2A surface reflectance",
        "collectionId": "sentinel-2-l2a",
        "catalogItemId": "S2C_MSIL2A_20261101T111211_N0513_R137_T29SPR_20261102T152046",
        "catalogUrl": "https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a/items/S2C_MSIL2A_20261101T111211_N0513_R137_T29SPR_20261102T152046",
        "sourceProductIdentifier": null,
        "productUri": "S2C_MSIL2A_20261101T111211_N0513_R137_T29SPR_20261102T152046.SAFE",
        "processingVersion": "05.13",
        "processingDateTime": null,
        "productType": null,
        "processingLevel": null,
        "assetSource": {
          "provider": "Microsoft Planetary Computer public Sentinel-2 L2A COG mirror",
          "collectionId": "sentinel-2-l2a",
          "itemId": "S2C_MSIL2A_20261101T111211_R137_T29SPR_20261102T152046"
        },
        "sourceProcessingNote": null
      },
      "measurements": [
        {
          "quantity": "NDVI",
          "representation": "index",
          "value": 0.368249284984567,
          "unit": "1",
          "unitStatus": "definedByQuantity",
          "statistic": "median",
          "grid": {
            "crs": "EPSG:32629",
            "resolution": [10, 10],
            "resolutionUnit": "m",
            "transformGdal": [623070, 10, 0, 3503690, 0, -10]
          },
          "quality": {
            "status": "accepted",
            "flags": null,
            "reasons": [],
            "validPixelCount": 22,
            "totalPixelCount": 22,
            "validPixelFraction": 1.0,
            "excludedPixelCount": 0
          },
          "processing": {
            "method": "sentinel-2-parcel-ndvi-provisional-v1",
            "bands": {
              "red": { "asset": "B04", "sourceAsset": "B04_10m", "resolutionM": 10, "scale": 0.0001, "offset": -0.1, "dataType": null, "nodataValue": null },
              "nir": { "asset": "B08", "sourceAsset": "B08_10m", "resolutionM": 10, "scale": 0.0001, "offset": -0.1, "dataType": null, "nodataValue": null }
            },
            "qualityLayer": {
              "asset": "SCL",
              "sourceAsset": "SCL_20m",
              "resolutionM": 20,
              "resampling": "nearest",
              "grid": {
                "crs": "EPSG:32629",
                "transformGdal": [623060, 20, 0, 3503700, 0, -20]
              },
              "excludedClasses": [0, 1, 3, 8, 9, 10, 11],
              "retainedClassesNote": "SCL classes 2 and 7 are retained."
            },
            "pixelInclusion": "pixel center",
            "minimumValidPixels": 5,
            "minimumValidFraction": 0.5
          }
        }
      ],
      "limitations": [
        "The SCL policy is provisional; classes 2 and 7 are retained.",
        "NDVI is an indirect vegetation indicator and does not by itself establish stress, irrigation, crop health, or cause."
      ]
    }
  ]
}
```

The result records Copernicus as product catalog, plus the Planetary Computer mirror item used for raster bytes. It does not serialize S2 source band dtype/nodata in the JSON artifact, so those values remain `null` in this mapped example. `processingLevel` remains null because the artifact does not expose a separate property.

### Sentinel-1 example

The CLI artifact does not record a requested date range. This example uses a one-day API request for the acquisition date solely to demonstrate the response shape; it is not metadata inferred from the CLI file.

```json
{
  "contractVersion": "1.0",
  "parcelId": "el haouz_Trees_20240110_036",
  "query": {
    "startDate": "2026-10-26",
    "endDate": "2026-10-26",
    "requestedMissions": ["Sentinel-1"]
  },
  "sensorResults": [
    { "mission": "Sentinel-1", "status": "available", "observationCount": 1 }
  ],
  "observations": [
    {
      "acquiredAt": "2026-10-26T06:28:03.879586Z",
      "observationDate": "2026-10-26",
      "mission": "Sentinel-1",
      "platform": "sentinel-1c",
      "instrument": "C-SAR",
      "sensorDetails": {
        "instrumentMode": "IW",
        "frequencyBand": "C",
        "centerFrequencyGHz": 5.405,
        "polarizations": ["VV", "VH"],
        "relativeOrbit": 154,
        "orbitState": "descending",
        "observationDirection": "right"
      },
      "source": {
        "catalogProvider": "Microsoft Planetary Computer Sentinel-1 RTC collection",
        "dataset": "Sentinel-1 RTC",
        "collectionId": "sentinel-1-rtc",
        "catalogItemId": "S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc",
        "catalogUrl": "https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-1-rtc/items/S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc",
        "sourceProductIdentifier": "S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_DEAB",
        "productUri": null,
        "processingVersion": null,
        "processingDateTime": "2026-10-26T07:19:14Z",
        "productType": "GRD",
        "processingLevel": "1",
        "assetSource": {
          "provider": "Microsoft Planetary Computer Sentinel-1 RTC collection",
          "collectionId": "sentinel-1-rtc",
          "itemId": "S1C_IW_GRDH_1SDV_20261026T062751_20261026T062816_010052_0140FD_rtc"
        },
        "sourceProcessingNote": "The RTC collection item reports productType=GRD and processingLevel=1. The result artifact does not establish which processing stage these properties describe, nor the upstream RTC processor version or DEM."
      },
      "measurements": [
        {
          "quantity": "gamma0BackscatterCoefficient",
          "polarization": "VV",
          "representation": "linearPower",
          "value": 0.12140032649040222,
          "unit": "1",
          "unitStatus": "adapterDeclaredSourceUnspecified",
          "statistic": "median",
          "grid": {
            "crs": "EPSG:32629",
            "resolution": [10, 10],
            "resolutionUnit": "m",
            "transformGdal": [623070, 10, 0, 3503690, 0, -10]
          },
          "quality": {
            "status": "accepted",
            "flags": null,
            "reasons": [],
            "validPixelCount": 22,
            "totalPixelCount": 22,
            "validPixelFraction": 1.0,
            "excludedPixelCount": null
          },
          "processing": {
            "method": "median of finite, nonnegative, non-nodata parcel pixels",
            "pixelInclusion": "pixel center",
            "excludedValues": ["product nodata", "nonfinite", "negative"],
            "additionalParcelSummaryFiltering": false,
            "sourceRaster": { "dataType": "float32", "nodataValue": -32768 }
          }
        },
        {
          "quantity": "gamma0BackscatterCoefficient",
          "polarization": "VV",
          "representation": "linearPower",
          "value": 0.1289640102874149,
          "unit": "1",
          "unitStatus": "adapterDeclaredSourceUnspecified",
          "statistic": "mean",
          "grid": {
            "crs": "EPSG:32629",
            "resolution": [10, 10],
            "resolutionUnit": "m",
            "transformGdal": [623070, 10, 0, 3503690, 0, -10]
          },
          "quality": {
            "status": "accepted",
            "flags": null,
            "reasons": [],
            "validPixelCount": 22,
            "totalPixelCount": 22,
            "validPixelFraction": 1.0,
            "excludedPixelCount": null
          },
          "processing": {
            "method": "mean of finite, nonnegative, non-nodata parcel pixels",
            "pixelInclusion": "pixel center",
            "excludedValues": ["product nodata", "nonfinite", "negative"],
            "additionalParcelSummaryFiltering": false,
            "sourceRaster": { "dataType": "float32", "nodataValue": -32768 }
          }
        },
        {
          "quantity": "gamma0BackscatterCoefficient",
          "polarization": "VH",
          "representation": "linearPower",
          "value": 0.016289573162794113,
          "unit": "1",
          "unitStatus": "adapterDeclaredSourceUnspecified",
          "statistic": "median",
          "grid": {
            "crs": "EPSG:32629",
            "resolution": [10, 10],
            "resolutionUnit": "m",
            "transformGdal": [623070, 10, 0, 3503690, 0, -10]
          },
          "quality": {
            "status": "accepted",
            "flags": null,
            "reasons": [],
            "validPixelCount": 22,
            "totalPixelCount": 22,
            "validPixelFraction": 1.0,
            "excludedPixelCount": null
          },
          "processing": {
            "method": "median of finite, nonnegative, non-nodata parcel pixels",
            "pixelInclusion": "pixel center",
            "excludedValues": ["product nodata", "nonfinite", "negative"],
            "additionalParcelSummaryFiltering": false,
            "sourceRaster": { "dataType": "float32", "nodataValue": -32768 }
          }
        },
        {
          "quantity": "gamma0BackscatterCoefficient",
          "polarization": "VH",
          "representation": "linearPower",
          "value": 0.017307163089175116,
          "unit": "1",
          "unitStatus": "adapterDeclaredSourceUnspecified",
          "statistic": "mean",
          "grid": {
            "crs": "EPSG:32629",
            "resolution": [10, 10],
            "resolutionUnit": "m",
            "transformGdal": [623070, 10, 0, 3503690, 0, -10]
          },
          "quality": {
            "status": "accepted",
            "flags": null,
            "reasons": [],
            "validPixelCount": 22,
            "totalPixelCount": 22,
            "validPixelFraction": 1.0,
            "excludedPixelCount": null
          },
          "processing": {
            "method": "mean of finite, nonnegative, non-nodata parcel pixels",
            "pixelInclusion": "pixel center",
            "excludedValues": ["product nodata", "nonfinite", "negative"],
            "additionalParcelSummaryFiltering": false,
            "sourceRaster": { "dataType": "float32", "nodataValue": -32768 }
          }
        }
      ],
      "limitations": [
        "The source STAC record omits unit, scale, and offset; the adapter declares unit 1 and the values are summarized as stored linear gamma-zero values, not dB.",
        "The RTC collection item reports productType=GRD and processingLevel=1; the result artifact does not establish which processing stage these properties describe, nor the upstream RTC processor version or DEM.",
        "C-band backscatter depends on moisture, vegetation, roughness, geometry, polarization, and processing; it is not a direct soil-moisture or stress measurement."
      ]
    }
  ]
}
```

## Compatibility and implementation notes

- The examples map the current CLI artifacts; they do not require renaming Python dataclass attributes or changing scientific calculations. Backend serialization is an explicit adapter responsibility.
- S2 result files currently serialize nested Python dataclasses with `snake_case`; do not expose those directly as public JSON. Map to this draft's `camelCase` schema.
- S1 VV and VH are two measurement objects, each retaining its own quality/coverage/grid. Do not move one polarization to a top-level scalar or average the two.
- If both missions are queried, return separate acquisition observations. Do not pair acquisitions solely because they cover the same parcel; dates, wavelength, geometry, resolution, and product level differ.
- `processing.method` for S1 describes this parcel summary only. The result artifacts do not expose an upstream RTC processor version or DEM; retain this as unknown in `sourceProcessingNote`, rather than filling it from unrelated product documentation.
- There is no processed-at timestamp in either real artifact. Do not fabricate it; add it only if the implementation records the actual processing instant.
- Unknown source QA should be `flags: null`; do not use `[]` unless QA was assessed and no flags apply.
- Real-output examples should be retained as provenance examples, not frontend mock fixtures. Cross-language mock fixtures should remain synthetic and clearly labeled as required by `INTEGRATION_GUIDELINES.md`.
- Before adoption, backend and frontend owners must review required/null semantics and the examples. Then either approve this as a revision to `DATA_CONTRACTS.md` or make that existing file the canonical version of this shape; do not keep two competing authorities.

## Backward-compatible migration from the NDVI contract

This is the first proposed wire-contract version (`contractVersion="1.0"`); the previous `DATA_CONTRACTS.md` is a pre-implementation semantic contract, and this repository has no API serializer or frontend result model to preserve at runtime. Adoption is therefore an atomic pre-release schema switch, not a dual-payload period. At approval, update the one canonical contract and derive both client/server types and the shared fixture from it before application integration.

| Existing NDVI contract | New contract mapping |
|---|---|
| `parcelId` | Remains `parcelId`. |
| `startDate`, `endDate`, NDVI request intent | Echo in `query`; set `requestedMissions` to `Sentinel-2` for an NDVI-only request. |
| Top-level `index="NDVI"` and `unit="1"` | Each NDVI measurement carries `quantity="NDVI"`, `representation="index"`, `unit="1"`, and `unitStatus="definedByQuantity"`. |
| Top-level `resultStatus` | Map to the Sentinel-2 entry in `sensorResults`; other requested missions have their own explicit status. |
| `observations[]` / `observationDate` / `acquiredAt` | Keep an observation per acquisition; retain both `observationDate` and `acquiredAt`. |
| Singular observation `value` | One NDVI measurement within `measurements[]`. |
| Observation `quality` | Attach equivalent quality to the NDVI measurement, with pixel counts/fraction for that measurement grid. |
| Response-level `provenance` | Put catalog/product provenance on each acquisition `source`; put NDVI inputs and method in the measurement `processing`. |
| `observationId`, internal `acquisitionId` | Not present in current CLI artifacts or implemented consumers. Do not fabricate them. The stable client key is catalog provider plus catalog item ID; if an application later requires opaque IDs, add them through a reviewed extension without replacing source IDs. |

No old API response exists, so no live client compatibility shim is needed. If a developer has a local mock or branch based on the old semantic shape, migrate it in the same approved integration change; do not maintain parallel authoritative schemas.

## Explicit exclusions

- No NISAR result, field, unit, or channel schema is defined here. Add NISAR only after a real product is read and its dataset attributes, units, masks, grid, and method are inspected.
- No API route, HTTP status mapping, database shape, authentication, or frontend presentation behavior is defined here.
- No causal or health classification is part of this contract.
