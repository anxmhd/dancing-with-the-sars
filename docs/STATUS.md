# Project status

Last updated: 2026-11-14

## Established

- Project instructions, architectural boundaries, shared semantic contracts, and scientific safeguards.
- Minimal React/TypeScript frontend shell and Python backend package foundation.
- Provisional per-acquisition Sentinel-2 NDVI processor and result assembler under `backend/src/dancing_with_sars/science/vegetation/`.
- NumPy, Rasterio, and Shapely as focused runtime dependencies; resolved versions are pinned in `backend/uv.lock`.
- Figshare parcel and NDVI archive file structure, license metadata, CRS, attribute schema, survey date span, and a representative dated CSV inspected. The archives remain in ignored local `data/raw/`, outside Git.
- Scientific processor interface, unresolved policy choices, source-access limitations, and validation boundary documented in `docs/SCIENCE_PROCESSING.md` and related scientific docs.

## Not established

- No Sentinel-2 satellite imagery acquired or processed. The inspected Figshare reference archives are not integrated; their NDVI CSV-to-parcel join remains unresolved, and no scientific results are validated.
- No provider data-access adapter, product catalog lookup, HTTP API, or frontend workflow.
- No production aggregation statistic, SCL exclusion policy, pixel-inclusion rule, or minimum-coverage threshold selected.
- No project OAuth credentials or exact parcel/date coverage query for Sentinel-2 L2A.

## Verification status

On Python 3.13.4, the locked dependencies installed successfully. Backend checks passed: `uv run --locked pytest` (15 passed) and `uv run --locked ruff check .`. Tests use synthetic fixtures only. The two smaller Figshare RAR archives were downloaded to ignored `data/raw/` and inspected; the 17.4 GB photo archive was not downloaded. No real imagery processing, independent scientific comparison, frontend check, or scientific validation was performed as part of this work.

## Next step

Review the provisional scientific interface and resolve the production statistic, SCL quality classes, parcel pixel inclusion, and minimum coverage with the team. Establish a stable join from Figshare NDVI CSVs to shapefile `parcel_id` or select a separate parcel source. Then select a Sentinel-2 L2A access path, verify acquisitions over chosen parcels/dates, and approve a small real-data validation task before implementing provider access or application orchestration.
