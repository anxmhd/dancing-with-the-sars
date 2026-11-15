# Domain model

## Scope

This conceptual model describes parcel-level multisensor observations. It is not a database schema or a claim that every candidate dataset is available. The wire representation is defined by [`contracts/multisensor-response.schema.json`](../contracts/multisensor-response.schema.json); this page explains the stable domain meanings behind it.

## Concepts

| Concept | Meaning | Owner |
|---|---|---|
| `StudyArea` | Named geographic analysis extent with source-backed boundary and provenance when established. | Backend/domain; frontend consumes GeoJSON view. |
| `AgriculturalParcel` | Source-backed geographic unit with an internal stable `parcelId`, geometry, and optional dated source attributes. It is not automatically a verified crop/irrigation label. | Backend and scientific data access. |
| `SatellitePlatform` / `Instrument` | Spacecraft/mission and instrument are distinct source metadata. | Scientific data access. |
| `SatelliteProduct` | Product or collection identity, processing level/version, acquisition metadata, and assets as actually supplied by the provider. Product ID, catalog item, and mirror/asset ID are separate. | Scientific data access. |
| `AcquisitionObservation` | One source acquisition at product-specific granularity, identified by acquisition timestamp and source lineage. It is not a parcel measurement. | Scientific data access. |
| `ParcelObservation` | One parcel and acquisition with one or more independent sensor-specific measurements plus acquisition metadata, quality, processing provenance, and limitations. | Science creates; backend serializes; frontend presents. |
| `Measurement` | A named quantity/statistic/channel with value or explicit null, unit/representation, grid, coverage/quality, and processing method. Sensor-specific metadata is retained. | Scientific owner defines meaning; backend maps; frontend displays. |
| `DataQuality` | Product flags and derived acceptance/exclusion assessment. Source flags, candidate counts, valid counts, and acceptance status must remain distinguishable. | Data access preserves; science evaluates. |
| `DataProvenance` | Source/product/acquisition identifiers, processing lineage, and known limitations needed to inspect/reproduce a result. | Data access and science produce; backend carries through. |

## Invariants

- Internal IDs are opaque and distinct from provider IDs. Never derive one by parsing another.
- A source acquisition and a parcel-level derived measurement are different records. One acquisition can support multiple parcel measurements.
- NDVI is a derived index. Sentinel-1 and NISAR gamma-zero are sensor/product measurements with distinct bands, channels, dates, geometries, and processing; do not treat them as interchangeable.
- Missing acquisition: no observation record. Excluded candidate: retain the observation and measurement with `value: null`, quality state, and reason. Unknown source/quality metadata stays unknown; it is not zero.
- `available` describes a result passing its declared software quality policy. It does not mean scientific validation.
- Do not synthesize geometry, time, source ID, product version, unit, calibration, or QA meaning. If unavailable, preserve the explicit unknown and limitation supported by the schema.

## Scientific interpretation limits

NDVI alone does not establish crop health, vegetation or water stress, irrigation, drought impact, or groundwater conditions. SAR backscatter is influenced by surface moisture, roughness, vegetation, polarization, incidence angle, wavelength, acquisition geometry, and processing; it is not a direct soil-moisture or stress measurement. Sentinel-1 C-band and NISAR L-band remain complementary measurements. Quantitative comparison requires justified compatibility; absent that, show them separately with limitations.
