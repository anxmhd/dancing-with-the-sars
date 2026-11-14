# Methodology and scientific safeguards

The current scientific code implements a provisional, synthetic-tested per-acquisition NDVI processor. It has now processed one real Sentinel-2 L2A acquisition and one Sentinel-1 RTC acquisition for the same reference parcel. The outputs are initial observations, not independently validated science findings; no NISAR raster was accessible for processing. See [the first result report](FIRST_REAL_MULTISENSOR_RESULT.md) and [processor boundary](SCIENCE_PROCESSING.md).

## Scientific credibility standard

Schedule pressure is handled by reducing scope, not scientific safeguards. Prefer a small number of well-supported results over more features or parcels that cannot be validated. For each result, identify the measured or derived quantity and preserve the exact source dataset/product, acquisition date and product metadata, units and scaling, spatial/temporal resolution, preprocessing and quality filtering, provenance, missing data, uncertainty, and limitations. Do not fill unknown metadata with convenient assumptions or present missing values as zero.

Keep observations, derived indicators, model estimates, statistical associations, interpretations, and hypotheses distinct. Do not claim validation when only implementation, synthetic software tests, internal consistency, or descriptive comparison has been shown. State explicitly what the evidence does and does not establish. If the available evidence cannot distinguish between explanations, describe the ambiguity rather than asserting a cause.

### Interpretation limits

- NDVI is an indirect vegetation indicator. NDVI alone does not prove vegetation stress, water stress, irrigation, drought impact, crop health, or groundwater conditions. Describe an NDVI change as a change in the vegetation index or vegetation dynamics. A pattern may be described as consistent with possible stress only when additional environmental or field evidence is presented and uncertainty is stated.
- SAR backscatter is affected by soil moisture, vegetation structure, surface roughness, polarization, incidence angle, wavelength, acquisition geometry, and processing. A backscatter change is not a direct measurement of soil moisture or vegetation stress without a justified, validated method.
- Sentinel-1 C-band and NISAR L-band are complementary sensors, not interchangeable measurements. A quantitative comparison must account for wavelength/frequency, polarization, acquisition date, viewing geometry, spatial resolution, processing level, and measured quantity. Do not calculate or interpret correlation solely because observations share a parcel. When the data do not support a defensible quantitative comparison, present the observations separately and explain what information each contributes.

### Literature use

Consult the available project scientific reference library when a methodological or interpretive decision depends on prior work. Before relying on a paper, verify that its study area, sensor/product, spatial and temporal scale, and research question apply to this workflow. Distinguish published evidence from this project's observations. Do not cite a source as validation for a claim it does not test. These checks do not replace direct validation of project processing and outputs.

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
