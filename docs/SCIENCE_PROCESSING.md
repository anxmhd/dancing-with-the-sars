# Scientific processing interface (provisional)

## Implemented responsibilities

- `science/vegetation/ndvi.py` remains the scientific core for per-acquisition Sentinel-2 NDVI. It requires co-gridded B04/B08 reflectance, accepts SCL on a different grid, aligns categorical SCL with nearest neighbor, applies an explicit policy, aggregates valid parcel pixels, and returns counts plus provenance.
- `data_access/sentinel2.py` reads Copernicus STAC product metadata and small B04/B08/SCL windows from public Planetary Computer COG mirrors. Source-product scale and offset come from the Copernicus STAC item; temporary access tokens are not written to outputs. It invokes the existing NDVI processor and writes JSON.
- `data_access/sentinel1.py` reads small VV/VH windows from one public Sentinel-1 RTC STAC item. `science/radar/sentinel1_rtc.py` applies parcel masking and summarizes finite, nonnegative, non-nodata gamma-naught values in linear power. It does not apply additional speckle filtering or a quality mask.
- `science/radar/nisar_gcov.py` reads one real-valued diagonal covariance layer from a locally available NISAR GCOV HDF5 product. It checks the product/granule ID, layer, units, coordinates, and projection; reads only the parcel window; and applies the product-documented GCOV mask and per-channel fully-focused validity bit when available. It reports mask/exclusion counts, number of looks, and source metadata. The actual product and parcel outcome are documented in [the NISAR validation report](NISAR_GCOV_PRODUCT_VALIDATION.md).

These modules are command-line scientific workflows only. There are no API routes, application orchestration, or frontend behavior. The initial Sentinel-1 and Sentinel-2 results are documented in [FIRST_REAL_MULTISENSOR_RESULT.md](FIRST_REAL_MULTISENSOR_RESULT.md), with the superseding NISAR product result in [NISAR_GCOV_PRODUCT_VALIDATION.md](NISAR_GCOV_PRODUCT_VALIDATION.md).

## Explicit demo choices

The Sentinel-2 command currently supplies a provisional policy: median NDVI; exclude SCL classes 0, 1, 3, 8, 9, 10, and 11; include pixels whose centers lie in the parcel; require at least 5 valid pixels and 50% valid coverage. Classes 2 and 7 are retained. These settings are reproducible for this small initial case, not approved production defaults or a validated cloud-screening method. Any production workflow requires scientific-owner review of the SCL classes, statistic, pixel inclusion, and coverage limits.

For Sentinel-1, the current method reports its source-declared gamma-zero values in linear power. For NISAR, the actual GCOV product declares unit `1`; the reader preserves the linear gamma-zero values and excludes nonfinite, negative, declared fill-value, invalid/not-fully-focused mask, unset channel focus-bit, and documented sample-slip pixels. The selected NISAR product's parcel candidates all fail its focus masks, so its output values are null. Neither sensor's backscatter is a direct soil-moisture or vegetation-stress observation.

## Product and provenance rules

- Preserve the original source product ID, acquisition date/time, processing version where available, product/polarization, scale/offset, unit, CRS, resolution, and grid metadata.
- Sentinel-2 B04/B08 are read at native 10 m and SCL at native 20 m; only categorical SCL is resampled, with nearest neighbor.
- Do not equate Sentinel-1 C-band and NISAR L-band measurements. Compare numeric values only after documenting frequency, polarization, date, geometry, resolution, processing level, and quantity. Otherwise retain separate observations.
- Report coverage, missing pixels, and unresolved quality flags. A valid software result is not a scientifically validated finding.
- NDVI is an indirect vegetation indicator. SAR backscatter depends on soil moisture, vegetation structure, surface roughness, polarization, frequency, acquisition geometry, and processing. Neither alone establishes stress, irrigation, drought effects, groundwater conditions, or causal mechanisms.

## Tests and scientific validation boundary

Automated tests use tiny synthetic GeoTIFF/HDF5 fixtures and an optional local-product regression test when the ignored NISAR file is present. They verify software behavior for parcel windows, grids, units, masks, nodata, scaling, and aggregation. They do not establish independent calibration accuracy, field validity, agronomic interpretation, or acceptance of the selected parcel's NISAR measurement. The real NISAR product was successfully read, but its masks exclude all parcel candidate pixels; see [the validation report](NISAR_GCOV_PRODUCT_VALIDATION.md).
