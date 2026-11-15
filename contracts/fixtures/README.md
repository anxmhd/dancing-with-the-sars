# Shared contract fixtures

These JSON files exercise the common response schema and expected sensor/query states. Real measurement values are mapped from the scientific artifacts named below; query windows and availability states in fixtures can be illustrative and must not be read as claims of live catalog coverage.

| Fixture | Scenario and evidence |
|---|---|
| `sentinel1-sentinel2-available.json` | Real values and metadata mapped from the Sentinel-1 RTC and Sentinel-2 L2A CLI result artifacts for the El Haouz parcel. The envelope's combined query window is an example, not evidence that an API searches that full interval. |
| `nisar-quality-excluded.json` | Real NISAR GCOV product metadata, four channel/frequency candidate records, grids, counts, masks, and limitations from `data/results/nisar_gcov_el_haouz_Trees_20240110_036_20261106.json`. Values are null because the product's validity masks reject every parcel candidate pixel. |
| `partial-sensor-availability.json` | Reuses the real Sentinel-1 accepted observation and NISAR excluded observation to demonstrate per-sensor outcomes. Its combined request is an interface scenario, not a single search made by an implemented API. |
| `no-observations.json` | Synthetic empty-result scenario. No measurement or source product is claimed. |
| `unavailable-source.json` | Synthetic inaccessible-source scenario. It does not claim that the provider was queried or failed for these dates. |

Scientific source files: `data/results/sentinel2_el_haouz_Trees_20240110_036_20261101.json`, `data/results/sentinel1_el_haouz_Trees_20240110_036_20261026.json`, and `data/results/nisar_gcov_el_haouz_Trees_20240110_036_20261106.json`. Values are copied, not recalculated. S1 mean and median are separate measurements for each polarization; S2 NDVI is the reported median. NISAR A/B are kept separate.

Validate with `uv run --project backend --locked python scripts/validate_contract.py`. Do not use synthetic empty/unavailable fixtures as data coverage claims or render their states as scientific findings.
