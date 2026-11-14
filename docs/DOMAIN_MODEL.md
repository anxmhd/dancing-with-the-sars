# First-workflow domain model

## Scope and status

This is a conceptual model for exploring one agricultural parcel's Sentinel-2 NDVI history. It is not a database schema, proof of dataset availability, or commitment to all listed attributes. `docs/DATA_CATALOG.md` still marks candidate sources `PLANNED`. Refine source-dependent fields after actual files and metadata are inspected.

Identifiers have two distinct roles:

- **Internal application identifiers** are opaque strings assigned by the application and remain stable within the application. They are not provider identifiers and must not be derived by parsing a source ID.
- **External identifiers** are preserved as source references, together with their provider and dataset/collection namespace. They may be absent, non-unique outside that namespace, or version-specific.

## Concepts

| Concept | Responsibility and important attributes | Relationships | Kind | Implementation owner |
|---|---|---|---|---|
| `StudyArea` | Named geographic scope; internal `studyAreaId`; display name; boundary geometry; source reference and boundary version when known. | Provides a spatial context for parcels and dataset coverage. Whether a parcel has a source-declared area ID or is associated by spatial intersection remains to be verified. | Domain concept backed by a source geometry. | Backend/domain contract; frontend consumes its GeoJSON view. |
| `AgriculturalParcel` | Candidate agricultural unit; internal `parcelId`; optional external parcel reference; geometry; source attributes and their observation/reference date when available. | Located in or spatially related to a study area; paired with vegetation outputs by internal ID. Do not assume source crop/irrigation labels or continuous temporal observations. | Domain concept backed by reference data. | Backend/domain contract; source mapping in scientific data access. |
| `SatellitePlatform / Sensor` | Distinguishes the spacecraft/platform from the instrument/sensor; source names or identifiers, mission, and sensor metadata only as provided by the selected product. | A product/acquisition references the relevant platform and sensor. Do not collapse the terms or assume a one-to-one relationship. | External source metadata represented as a domain reference. | Scientific data-access metadata mapping. |
| `SatelliteProduct` | Provider-defined collection/product family and processing level/version; provider, external collection/product identifiers, product type, and relevant spatial/temporal coverage. Exact attributes depend on the chosen Sentinel-2 product. | Contains or describes satellite acquisitions and associated assets/quality information. | External source entity/reference. | Scientific data access. |
| `SatelliteObservation` | One acquisition record at a product-appropriate grain; internal `acquisitionId`; external acquisition reference; acquisition time/date as actually supplied; footprint and source quality metadata where available. It does not contain a parcel-derived NDVI value. | References a product and platform/sensor; may produce vegetation observations for multiple parcels. Granularity (tile, granule, scene, or asset) must follow source inspection. | Source observation/acquisition metadata. | Scientific data access. |
| `VegetationObservation` | A derived result for one parcel, acquisition, index, and processing version; internal `vegetationObservationId`; `parcelId`; `acquisitionId`; index name (`NDVI` for this workflow); dimensionless value when accepted; quality outcome. | Derived from source reflectance observations and parcel geometry using a documented method; links to provenance and quality. | Derived scientific result, not a raw satellite measurement. | Scientific processing creates it; backend serializes it. |
| `DataProvenance` | Lineage needed to reproduce/interpret a result: provider, external dataset/product/acquisition references when known, product version, processing software/version, method/parameters, processing time, and source/derived relationships. | Attached to a product/acquisition and carried through to each result or response without losing source references. | Cross-cutting lineage record. | Data access records source lineage; scientific processing records its method; backend exposes it. |
| `DataQuality` | Product-specific source flags and derived-result assessment; status, source flags/reasons, and valid/total pixel counts if available and meaningful. Preserve unknown quality distinctly from accepted/excluded. | Applies to an acquisition, input pixels/mask, or parcel-level result; do not treat these quality scopes as interchangeable. | Source metadata plus derived assessment. | Data access preserves flags; scientific processing applies the approved policy and reports its outcome. |

## Relationships and invariants

- An internal parcel ID is the application's stable reference. A source parcel ID is a separate optional provenance field, scoped by its provider/dataset.
- An acquisition and a vegetation result are different objects. One acquisition can support many parcel-level results; one result is tied to one parcel, acquisition, index, and processing version.
- Reflectance bands and quality layers are source measurements/assets. NDVI is calculated from appropriate input bands and is not a raw measurement.
- A result is accepted only under a documented quality policy. Excluded or unassessed candidates must not be presented as accepted numeric observations.
- A **missing observation** means no observation record is available for the relevant acquisition/date. It is not a record with a made-up value or a zero. An **invalid/excluded observation** means a candidate record exists but fails the documented quality policy; retain its exclusion state/reasons where the source supports that distinction.
- Do not synthesize acquisition times, source IDs, geometry, product versions, or parcel labels. If an item is not provided or verified, represent it as unknown/absent per the data contract.

## Deliberately unresolved

The source parcel key and geometry model, study-area boundary, acquisition grain, source product identifier, reflectance processing level, pixel aggregation statistic, CRS strategy, quality policy, and provenance granularity require inspection and scientific review. No database tables are prescribed.
