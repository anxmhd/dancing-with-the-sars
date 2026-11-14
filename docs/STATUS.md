# Project status

Last updated: 2026-11-14

## Established

- Project instructions, architectural boundaries, shared semantic contracts, and scientific safeguards.
- Minimal React/TypeScript frontend shell and Python backend package foundation.
- Provisional per-acquisition Sentinel-2 NDVI processor and result assembler under `backend/src/dancing_with_sars/science/vegetation/`.
- Sentinel-2 L2A STAC/COG adapter and CLI; one real parcel NDVI result written to `data/results/` with source calibration, grids, QA policy, coverage, and processing provenance.
- Sentinel-1 RTC COG adapter and CLI; one real VV/VH parcel gamma-naught summary written to `data/results/`, reported separately from NDVI.
- NISAR GCOV HDF5 reader inspected and corrected against the user-supplied actual product. It reads four diagonal polarization/frequency layers and preserves product lineage, units, grids, and masks. All El Haouz parcel candidates are marked not fully focused, so no accepted NISAR parcel statistic exists; see [the product validation report](NISAR_GCOV_PRODUCT_VALIDATION.md).
- NumPy, Rasterio, Shapely, and h5py as focused runtime dependencies; resolved versions are pinned in `backend/uv.lock`.
- Figshare parcel and NDVI archive file structure, license metadata, CRS, attribute schema, survey date span, and a representative dated CSV inspected. The archives remain in ignored local `data/raw/`, outside Git.
- Exact Figshare parcel-to-series join verified by unique `parcel_id` = CSV filename stem for 9,993 files; 390 parcel records have no CSV, including 2 of 1,752 El Haouz records. Full evidence and temporal limitations are in `docs/FIGSHARE_JOIN_INVESTIGATION.md`.
- Scientific processor interface, explicit provisional SCL/coverage choices, source-access limitations, and validation boundary documented in `docs/SCIENCE_PROCESSING.md` and [the first real result](FIRST_REAL_MULTISENSOR_RESULT.md).

## Not established

- No Sentinel-1/NISAR numeric comparison. The actual NISAR product is locally available and has been read, but its masks reject every candidate pixel in the selected parcel. No accepted NISAR parcel-level measurement exists.
- No API route, frontend workflow, multi-acquisition time series, or full user-facing application workflow.
- The SCL exclusion set, median statistic, pixel-center inclusion, and minimum 5 pixels/50% coverage are explicit demo choices only, not approved production policy.
- The Figshare supplied NDVI series are not integrated; their product provenance/QA and repeated same-date records remain unresolved. The 2024 crop/irrigation survey labels are not current 2026 ground truth.

## Verification status

On Python 3.13.4, the backend suite passed after NISAR product support was updated: 22 tests passed, including a local actual-product regression test; `ruff check .` passed. The NISAR CLI read the supplied HDF5 product and produced a four-layer artifact with no accepted parcel values because all parcel candidates fail the product's focus-validity masks. Software checks establish reader behavior, not independent measurement accuracy or field validity. No frontend/API integration or Sentinel-1/NISAR comparison was performed.

## Next step

Resolve the NISAR validity-mask limitation with the scientific owners and select an acquisition with valid focused parcel pixels if a numeric NISAR measurement is required. Then review the NISAR-specific fields before API integration. Keep Sentinel-1, NISAR, and optical measurements distinct unless a defensible comparison method is approved.
