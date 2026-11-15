# Project overview

## Research question

How can multi-frequency radar and optical satellite observations, combined with climate data and agricultural field observations, help us understand seasonal agricultural dynamics and climate-related vegetation stress in the Haouz plain?

## Study area

The Haouz plain in the Marrakech–Tensift region of Morocco. One Figshare parcel source and the selected El Haouz parcel geometry have been inspected. A definitive study-area boundary remains to be identified before regional coverage claims.

## Scientific direction

The project aims to support agricultural mapping, vegetation monitoring, irrigated/rainfed comparisons where ground truth supports them, radar analysis, climate context, and evidence-based case studies. The expected application is a geographic web interface for scientists, students, and informed users.

These are project objectives, not claims that data is available or that analyses have been performed. Groundwater depletion is a secondary topic only if reliable relevant measurements become available. SAR backscatter is not a direct groundwater measurement, and surface deformation alone is not proof of groundwater depletion.

## Evidence language

Distinguish direct observations, derived indicators, model estimates, statistical associations, interpretations, and unverified hypotheses. Satellite values are not field measurements. Do not present correlation as causation. Document uncertainties, data gaps, provenance, and methods alongside future results.

## Current implementation and integration

The scientific package has one real parcel result each for Sentinel-2 L2A, Sentinel-1 RTC, and a locally supplied NISAR GCOV product. The NISAR product was successfully read, but all candidate pixels for the selected parcel fail its source focus masks; no numeric NISAR parcel value exists. These results are software-processed and not independently scientifically validated.

The first application workflow is parcel selection on a map followed by a date-window query and inspection of acquisition-specific measurements, quality/coverage, provenance, and limitations. The wire contract and implementation boundaries are in [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) and [`DATA_CONTRACTS.md`](DATA_CONTRACTS.md). The API and interactive map are not implemented.
