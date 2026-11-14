# Scientific processing interface (provisional)

## Scope and status

The backend package now contains a small, synthetic-tested processor for one parcel and one already selected Sentinel-2 acquisition. It calculates parcel NDVI from caller-supplied red and near-infrared raster bands and a caller-supplied Scene Classification Layer (SCL). It has no provider adapter, archive reader, catalog search, API route, or data download behavior.

The Python boundary in `backend/src/dancing_with_sars/science/vegetation/ndvi.py` is provisional for Developer 2 to review. It does not freeze or replace `docs/DATA_CONTRACTS.md`; agree on its shape and error mapping before application integration.

## Responsibilities

- `RasterBand` carries a 2-D array, affine transform, declared CRS, nodata value, scale, and offset. Data-access code must supply the correct product-specific encoding and metadata.
- `ProcessingPolicy` requires the aggregation statistic (`mean` or `median`), excluded integer SCL class codes, pixel-boundary inclusion choice (`all_touched`), and both minimum-valid-pixel thresholds. There are no scientific policy defaults.
- `process_parcel_acquisition` validates the parcel geometry and co-grid requirement for red/NIR, transforms the geometry into the raster CRS, rasterizes it, aligns categorical SCL values using nearest-neighbor resampling, applies nodata/finite/denominator/QA masking, calculates NDVI, then aggregates accepted pixels.
- `NdviObservation` returns a numeric value only when the explicit minimum coverage rules pass. Otherwise, `value` is `None`, status is `excluded`, and reason codes/counts (including SCL-excluded pixels) are retained.
- `NdviProvenance` records parcel/acquisition references, date, product/version labels supplied by the caller, input/output grid CRS and transforms, statistic, QA class set, pixel policy, thresholds, and red/NIR scale/offset.
- `assemble_series` only orders already processed acquisition candidates and emits `available`, `no_observations`, or `no_valid_observations`. Acquisition discovery belongs to an eventual data-access/use-case component. Dates without acquisitions remain absent; this function does not interpolate.

## Scientific constraints and open decisions

Sentinel-2 L2A documents B04 red and B08 near-infrared at 10 m and SCL at 20 m; confirm these roles and scale/offset from the actual selected product. SCL-to-reflectance alignment in this processor uses nearest neighbor because the SCL classes are categorical. This is a technical alignment method, not a selected production cloud policy. No excluded-class set, minimum coverage, statistic, or parcel-boundary policy is approved as a project default. The caller must state these choices, and the team must review them before real imagery is processed.

The processor requires SCL input and treats source SCL nodata, masked-array pixels, and areas outside the SCL footprint as invalid. If a product signals SCL no-data using a class code but does not declare that code as nodata metadata, the caller must include it in the explicit exclusion set. Red and NIR must already share the same shape, transform, and CRS; the processor rejects mismatches instead of silently resampling reflectance. Parcel geometry is passed as GeoJSON-like geometry with an explicit CRS; its CRS is never inferred. Results are indicators and do not establish vegetation stress or its cause.

## Minimal integration example

The following is a call shape, not real data or an approved policy:

```python
policy = ProcessingPolicy(
    statistic="median",  # choose only after team review
    excluded_scl_classes=frozenset({3, 8, 9, 10}),  # illustrative only
    all_touched=False,  # illustrative only
    minimum_valid_pixels=1,  # illustrative only
    minimum_valid_fraction=0.5,  # illustrative only
)
candidate = process_parcel_acquisition(
    parcel_id=parcel_id,
    acquisition_id=acquisition_id,
    acquisition_date=acquisition_date,
    geometry=parcel_geometry,
    geometry_crs=parcel_crs,
    red=red_band,
    nir=nir_band,
    scl=scl_band,
    source_product=product_name,
    source_product_version=product_version,
    policy=policy,
)
```

The values above only demonstrate explicit arguments. They are not a production QA recommendation. The application layer must map the typed result to the shared semantic contract without reimplementing NDVI or presenting an excluded value as numeric.

## Validation boundary

Tests use small synthetic arrays and geometries. They verify arithmetic, scaling/nodata behavior, QA exclusion/alignment, geometry CRS and pixel inclusion, aggregation, coverage thresholds, provenance, and series status/order. They do not validate a Sentinel-2 source product, real-data coverage, agronomic interpretation, or scientific agreement against field measurements.
