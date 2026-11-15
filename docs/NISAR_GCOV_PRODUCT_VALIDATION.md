# NISAR GCOV local-product validation

**Product:** `NISAR_L2_PR_GCOV_035_023_D_073_2005_DHDH_M_20261106T192031_192107_P05036_N_F_J_001`
**Validation date:** 2026-11-14
**Scope:** inspect the supplied HDF5 product, correct the local reader where product evidence required it, and evaluate the El Haouz reference parcel.
**Outcome:** the HDF5 product was read successfully, but the source masks reject all parcel candidate pixels. No accepted parcel-level backscatter statistic is available for this parcel. The same granule does pass the unchanged policy for three other El Haouz parcels; see [the multisensor campaign report](MULTISENSOR_CAMPAIGN_2026.md).

## Product and layers inspected

The local file is in `data/raw/nisar/`, which is excluded from Git by the repository's `data/raw/` ignore rule. Its size is 1,967,128,576 bytes. The internal `/science/LSAR/identification/granuleId` exactly matches the supplied product ID. The reader now verifies this match whenever the granule identifier is present.

The HDF5 contains `/science/LSAR/GCOV/grids/frequencyA` and `frequencyB`. Both contain real-valued diagonal covariance datasets `HHHH` and `HVHV`, representing HH and HV channels respectively. No VV/VH or off-diagonal measurement was requested or inferred. Each layer has `float32` values, `units="1"`, and `_FillValue=NaN`. The source file's HDF5 storage fill value is 0.0; the reader does not treat that storage setting as nodata because the dataset's declared `_FillValue` is NaN and zero is within the layer's `valid_min=0` range.

| Grid | Source layer | Polarization | Shape | Grid spacing | CRS | Center frequency | Processed range bandwidth |
|---|---|---:|---:|---:|---|---:|---:|
| Frequency A | `HHHH` | HH | 17,100 × 17,424 | 20 m | EPSG:32629 | 1,229,000,000 Hz | 20,000,000 Hz |
| Frequency A | `HVHV` | HV | 17,100 × 17,424 | 20 m | EPSG:32629 | 1,229,000,000 Hz | 20,000,000 Hz |
| Frequency B | `HHHH` | HH | 4,275 × 4,356 | 80 m | EPSG:32629 | 1,293,500,000 Hz | 5,000,000 Hz |
| Frequency B | `HVHV` | HV | 4,275 × 4,356 | 80 m | EPSG:32629 | 1,293,500,000 Hz | 5,000,000 Hz |

The grids' coordinate axes are pixel centers (`pixel_coordinate_convention="center"`); X spacing is positive and Y spacing is negative. The reader uses the explicit product spacing and half-cell offsets to build the GDAL transform, including when a parcel window has only one row or column. It checks coordinate-vector increments against the declared spacing and validates raster dimensions against the coordinate vectors.

The identification datasets report platform `NISAR`, instrument `LSAR`, product type `GCOV`, product level `L2`, radar band `L`, product version `1.0.20`, specification version `1.6.0`, composite release `P05036`, processing center `JPL`, processing type `Nominal`, descending pass, left look, track 23, absolute orbit 6696, and processing time `2026-11-12T04:39:52Z`. Acquisition begins at `2026-11-06T19:20:31.000000000Z` and ends at `2026-11-06T19:21:07.999342105Z`. These are read from the HDF5 identification datasets rather than inferred from the filename. The product was previously identified through ASF in collection `NISAR_L2_GCOV_V1`; since the exact catalog item record was not retained, this local inspection does not independently verify that collection-to-file association or maturity metadata.

The [ASF NISAR GCOV guide](https://nisar-docs.asf.alaska.edu/gcov/) describes GCOV diagonal terms as calibrated, terrain-corrected gamma-zero power, explains that Frequency B uses 80 m spacing, and documents the layer families. The actual product's `units="1"` is preserved. The artifact uses `gamma0BackscatterCoefficient`, `representation="linearPower"`, and unit `1`; it does not convert values to dB. The dataset description and product documentation establish the gamma-zero interpretation for these diagonal layers. The guide also documents adaptive area-based multi-looking and the role of the number-of-looks and RTC gamma-to-sigma datasets.

## Parcel geolocation and quality findings

The parcel is the existing `el haouz_Trees_20240110_036` Figshare reference polygon in EPSG:4326, with bounds `[-7.7018258165, 31.6609969445, -7.7013074918, 31.6618212511]`. The HDF5 identification bounding polygon contains the parcel. The reader transforms it to EPSG:32629; its projected bounds are `[623072.51, 3503593.17, 623121.56, 3503684.42]`. The source coordinate axes span X 349,210–697,670 m and Y 3,566,870–3,224,890 m for A, and X 349,240–697,640 m and Y 3,566,840–3,224,920 m for B. All raster windows are inside the coordinate vectors and layer dimensions. Pixel centers inside the parcel are counted using the existing pixel-center rule.

| Frequency | Candidate pixel centers inside parcel | Mask values | Channel focus-valid bits | Accepted pixels |
|---|---:|---|---|---:|
| A / HH (`HHHH`) | 6 | `0: 6` | bit 256 unset for all 6 | 0 |
| A / HV (`HVHV`) | 6 | `0: 6` | bit 512 unset for all 6 | 0 |
| B / HH (`HHHH`) | 1 | `0: 1` | bit 256 unset for 1 | 0 |
| B / HV (`HVHV`) | 1 | `0: 1` | bit 512 unset for 1 | 0 |

In this product, the GCOV mask description says a sample is valid only when generated from fully focused radar samples, and mask 0 denotes an averaging set containing partially focused or invalid radar samples; mask 255 denotes pixels outside acquisition coverage. The `inputDataExceptionMask` description separately assigns fully-focused validity bits 256 to HH and 512 to HV. For each candidate parcel pixel its value is 0, so neither the GCOV mask nor the channel-specific focus-valid bit supports including its backscatter value. The reader now requires a valid nonzero/non-255 GCOV mask and, when the exception-mask dataset exists, a set channel focus bit; the documented sample-slip exception bit 2 is also excluded. It records the mask counts and exclusions rather than treating these flags as decorative metadata.

The raw covariance arrays contain stored numeric samples at those candidate locations, but all are excluded by the product validity information. The output therefore records `value: null`, 0 valid pixels, the candidate count, and the quality reasons for each frequency/polarization. It does not report their median or mean as parcel measurements. Number-of-looks summaries are retained as diagnostics over candidate pixels and are not treated as evidence that excluded samples are valid.

## Reader changes

The existing reader already used the correct GCOV grid paths, `xCoordinates`/`yCoordinates`, projection EPSG attribute, layer `units`, parcel reprojection, and parcel-window reads. Inspection identified two material defects for this actual file:

1. It reported mask values but did not exclude mask 0 or use the per-polarization fully-focused validity bit. This could have yielded an apparently valid but scientifically unsupported parcel statistic.
2. It attempted to read provenance as group attributes, while this product stores identification fields as scalar or vector datasets. It also parsed acquisition time from the filename, truncating sub-second precision.

The corrected reader reads product metadata datasets, retains the exact product identity and source-layer metadata, uses the HDF5 acquisition and processing times, preserves units, datatype, fill value, frequency, bandwidth, CRS, spacing, mask counts, exception counts, and number-of-looks summary, and supports one-pixel windows on the 80 m grid. It uses the dataset `_FillValue` and does not mistake the HDF5 storage `fillvalue=0` for nodata. The CLI writes a scientific parcel-summary artifact separate from any API response serialization.

## Result artifact

The CLI produced [nisar_gcov_el_haouz_Trees_20240110_036_20261106.json](../data/results/nisar_gcov_el_haouz_Trees_20240110_036_20261106.json). It contains four independent measurements: Frequency A HH/HV and Frequency B HH/HV, each retaining its own native grid, frequency, covariance layer, unit, processing lineage, and quality counts. All four have null summary values because no candidate pixel passes the product mask rules. The exact local file path is omitted from the result; the HDF5 granule ID is preserved. The artifact notes that the original catalog record and download URL were not retained.

This artifact is a scientific CLI result, not a claim that the current API contract has a NISAR schema. It follows the shared observation and measurement semantics, while preserving NISAR-specific frequency and covariance-term metadata. The backend and frontend API models remain unchanged.

## Validation performed

- Inspected HDF5 group and dataset structure, scalar/vector identification data, layer shapes/dtypes/attributes, coordinate axes, CRS, mask/exception-mask descriptions, number of looks, and frequency metadata.
- Verified the internal granule ID against the product filename.
- Ran the NISAR CLI on the local product and existing parcel, extracting both available diagonal polarizations on both grids.
- Parsed and checked the emitted JSON. Confirmed the product ID, acquisition and processing times, product version, CRS, native spacings, center frequencies, range bandwidths, four distinct channels, and the 6/6 and 1/1 candidate counts with 0 accepted pixels.
- Confirmed the product file matches the `data/raw/` Git ignore rule.
- Ran backend tests: **22 passed**, including synthetic mask/nodata/single-pixel cases and a local actual-product regression test (the latter skips automatically if the ignored product file is absent).
- Ran `ruff check .`: **passed**.

These checks establish that this file was read, the implementation applies the product's explicit spatial/quality metadata, and the resulting artifact is reproducible. They do not establish independent calibration accuracy, field validity, or scientifically valid parcel backscatter values for this geometry, because the product's masks exclude every parcel candidate pixel.

## Remaining limitations

- No accepted parcel-level NISAR measurement exists for this parcel and product. More output values would require valid focused pixels from another acquisition or a scientifically justified alternative sampling method; this task did not change the mask policy to force a value.
- The exact ASF catalog item URL and transfer metadata were not preserved with the user-supplied local file.
- `inputDataExceptionMask` has a documented sample-slip code and per-channel validity bits; only these documented bits are interpreted. Other future codes must be reviewed before any new filtering or quality claim.
- Frequency A and B have different center frequencies, bandwidths, and grid spacings. Their measurements are retained as distinct observations; they are not averaged or treated as interchangeable.
- NISAR L-band and Sentinel-1 C-band are not compared numerically. Any future comparison must account for frequency, polarization, acquisition time, geometry, processing, resolution, and measured quantity.
- Gamma-zero power is not a direct soil-moisture or vegetation-stress measurement.
- The local end-to-end test depends on the ignored 1.97 GB product being present. Synthetic tests remain the portable default elsewhere.
