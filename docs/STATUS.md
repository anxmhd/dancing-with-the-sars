# Project status

Last updated: 2026-11-14

## Established

- Project instructions, architectural boundaries, shared semantic contracts, and scientific safeguards.
- Minimal React/TypeScript frontend shell and Python backend package foundation.
- Provisional per-acquisition Sentinel-2 NDVI processor and result assembler under `backend/src/dancing_with_sars/science/vegetation/`.
- NumPy, Rasterio, and Shapely as focused runtime dependencies; resolved versions are pinned in `backend/uv.lock`.
- Figshare parcel and NDVI archive file structure, license metadata, CRS, attribute schema, survey date span, and a representative dated CSV inspected. The archives remain in ignored local `data/raw/`, outside Git.
- Exact Figshare parcel-to-series join verified by unique `parcel_id` = CSV filename stem for 9,993 files; 390 parcel records have no CSV, including 2 of 1,752 El Haouz records. Full evidence and temporal limitations are in `docs/FIGSHARE_JOIN_INVESTIGATION.md`.
- Scientific processor interface, unresolved policy choices, source-access limitations, and validation boundary documented in `docs/SCIENCE_PROCESSING.md` and related scientific docs.

## Not established

- No Sentinel-2 satellite imagery acquired or processed. The Figshare source series are not integrated; the file-to-parcel ID association is verified, but CSV provenance/QA and the meaning of repeated same-date rows remain unresolved, and no scientific results are validated.
- No provider data-access adapter, product catalog lookup, HTTP API, or frontend workflow.
- No production aggregation statistic, SCL exclusion policy, pixel-inclusion rule, or minimum-coverage threshold selected.
- No project OAuth credentials or exact parcel/date coverage query for Sentinel-2 L2A.

## Verification status

On Python 3.13.4, the locked dependencies installed successfully. Backend checks passed: `uv run --locked pytest` (15 passed) and `uv run --locked ruff check .`. Tests use synthetic fixtures only. The two smaller Figshare RAR archives were downloaded to ignored `data/raw/` and inspected; the 17.4 GB photo archive was not downloaded. No real imagery processing, independent scientific comparison, frontend check, or scientific validation was performed as part of this work.

## Next step

Ask the Figshare dataset authors to confirm the identifier relationship and provide source/product, reflectance scaling, acquisition-level, and quality-processing metadata for the supplied series. Review the provisional scientific interface and resolve the production statistic, SCL quality classes, parcel pixel inclusion, and minimum coverage with the team. Then select a Sentinel-2 L2A access path, verify acquisitions over chosen parcels/dates, and approve a small real-data validation task before implementing provider access or application orchestration.
