# Methodology and scientific safeguards

The current scientific code implements a provisional, synthetic-tested per-acquisition NDVI processor. It has not been run against a Sentinel-2 product and is not scientifically validated. See [the processor boundary and unresolved choices](SCIENCE_PROCESSING.md).

## Current NDVI implementation

For explicit red and near-infrared surface-reflectance inputs, the processor calculates per-pixel NDVI as `(NIR - Red) / (NIR + Red)`. A denominator of zero, nodata, non-finite reflectance, invalid quality-mask pixels, and pixels excluded by caller-supplied SCL class codes do not contribute. Scale and offset are applied from each supplied band; the processor does not assume a universal encoding. Red/NIR grids must match. A categorical SCL mask on another grid is aligned to that grid using nearest-neighbor resampling. Parcel geometry is transformed from its explicitly declared CRS and rasterized using the explicit pixel-boundary policy.

The output statistic, excluded SCL classes, pixel-boundary rule, and minimum valid count/fraction are mandatory call inputs with no project default. This avoids treating one plausible QA convention as an approved scientific decision. The actual Sentinel-2 L2A product's metadata and suitable QA policy must be reviewed before use. [Sentinel Hub's S2 L2A reference](https://docs.sentinel-hub.com/api/latest/data/sentinel-2-l2a/) identifies B04 red and B08 NIR at 10 m and SCL at 20 m; selected-product metadata remains authoritative.

The processor is per acquisition. A small assembler orders processed candidates and represents empty/no-valid states; it does not discover acquisitions. A missing acquisition remains absent, and no interpolation is performed. The output is parcel-level NDVI, an indirect vegetation indicator, not evidence of stress or its cause.

- Keep source observations, derived indicators, model estimates, associations, and interpretations clearly distinguished.
- Record inputs, product versions, processing steps, parameters, units, CRS, quality flags, uncertainty, and missing-data treatment so outputs can be reproduced.
- Verify actual data availability and inspect metadata before implementation. Do not substitute a different product silently.
- Treat SAR response as sensitive to surface roughness, soil moisture, vegetation structure, incidence angle, and crop development. Do not interpret backscatter as a direct groundwater measure.
- Treat optical indices as affected by cloud, atmosphere, and processing choices.
- Preserve the scale limitations of CHIRPS and ERA5-Land; do not present their coarse estimates as parcel observations.
- Respect dates and geographic coverage of field observations. Do not infer a continuous series from a dated reference sample.
- Handle missing values explicitly. Do not fabricate measurements or interpolate without a documented justification.
- A statistical association does not establish causation. Groundwater depletion requires relevant measurements and an appropriate method; deformation alone is insufficient evidence.
- Forecasting is deferred and must not be implemented without explicit approval.
