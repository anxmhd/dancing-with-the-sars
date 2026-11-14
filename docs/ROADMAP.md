# Roadmap

This roadmap is conditional on user approval, verified data, and scientific feasibility. Planned modules are not implemented by virtue of appearing here.

| Phase | Scope | Status |
|---|---|---|
| 0 — Foundation | Establish project instructions, documentation, minimal frontend/Python package, checks, CI, and Git conventions. | IMPLEMENTED; TESTED (foundation checks passed) |
| 1 — Application foundation | Define and implement only the approved application shell and real interfaces. Add FastAPI when a concrete API requirement exists. | PLANNED |
| 2 — Geospatial/data foundation | Identify the study boundary and inspect approved parcel/reference data; define metadata and validation conventions. | PARTIALLY ESTABLISHED: Figshare archives inspected and exact parcel-to-CSV IDs reconciled; definitive study boundary unresolved. |
| 3 — Vegetation monitoring | Introduce verified optical data and approved indicators with documented processing and validation. | PROCESSOR AND PUBLIC L2A ACCESS IMPLEMENTED; one real parcel result processed; provisional quality choices and independent scientific validation remain open. |
| 4 — Radar monitoring | Introduce verified Sentinel-1 data; integrate mandatory NISAR products with defensible sensor-specific interpretation. | SENTINEL-1 RTC READER AND ONE REAL RESULT IMPLEMENTED; actual NISAR GCOV product read and reader corrected; all El Haouz candidates fail source focus masks, so no accepted NISAR value or cross-sensor comparison exists. |
| 5 — Climate context | Introduce approved rainfall/reanalysis variables with appropriate scale and temporal aggregation. | PLANNED |
| 6 — Analysis and storytelling | Implement approved comparisons and case studies only when supported by evidence. | PLANNED |
| 7 — Validation and demonstration readiness | Complete relevant software and scientific validation and usability/documentation review. | PLANNED |

Forecasting is reserved for future development and is not part of this roadmap's implementation scope.
