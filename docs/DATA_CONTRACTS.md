# Shared data contracts

## Authority

The authoritative version 1.0 multisensor response contract is [`contracts/multisensor-response.schema.json`](../contracts/multisensor-response.schema.json) (JSON Schema Draft 2020-12). The shared API error envelope is [`contracts/api-error.schema.json`](../contracts/api-error.schema.json). Do not define independent frontend/backend response shapes or treat the scientific CLI JSON files as API responses.

The response envelope identifies the parcel and query, reports one availability state for each requested mission, and carries zero or more chronological acquisition observations. An observation belongs to one parcel/acquisition and contains one or more independent measurements. Sensor-specific fields remain explicitly tagged; NDVI, Sentinel-1 C-band gamma-zero, and NISAR L-band GCOV channels are not interchangeable.

## Core semantics

- JSON property names use `camelCase`; JSON numbers must be finite. Unknown metadata uses the schema's nullable fields and is never fabricated.
- Instants preserve source fractional precision and use UTC `Z`; calendar dates use `YYYY-MM-DD`. Query ranges are inclusive.
- A missing acquisition is absent. An excluded/unassessed acquisition remains present with null measurement values, explicit quality status, and reasons. `noObservations`, `noValidObservations`, `unavailable`, and `available` have distinct meanings.
- Measurements identify quantity, sensor-specific channel/frequency, representation, unit and unit status, statistic, grid, coverage/quality, processing, and limitations/provenance.
- `available` means at least one numeric result passed the declared software quality policy. It does not mean the method or result has been scientifically validated.
- Product/source identity is kept distinct from catalog item ID and asset/mirror identity. A source catalog record not retained is represented as null, not inferred from a product name.
- GeoJSON API geometry, if exposed, follows RFC 7946 WGS 84 longitude/latitude order. Geometry is not duplicated into the observations response.

## Measurement semantics

| Mission | Quantity and channel | Representation/unit | Limit |
|---|---|---|---|
| Sentinel-2 | `NDVI`, derived from product-specific B04 red and B08 NIR reflectance | index, unit `1` | Indirect vegetation index; alone it does not establish crop health, stress, irrigation, drought impact, or groundwater conditions. |
| Sentinel-1 | `gamma0BackscatterCoefficient`, frequency band C, polarization VV or VH | stored linear power, unit `1`; `unitStatus` records that source unit/scale/offset were not specified in STAC | Not dB and not a direct soil-moisture/stress measurement. |
| NISAR | `gamma0BackscatterCoefficient`, product frequency A/B, polarization HH/HV, corresponding diagonal covariance term | `linearPower`, unit `1` as defined by the inspected GCOV quantity | A/B are separate channels/grids. Current real parcel candidates are all rejected by product focus masks; no numeric parcel value is available. |

For aggregation, the statistic applies to the measurement's parcel pixels after the documented mask and validity rules. Distinct `mean` and `median` records are separate measurements. Do not silently substitute one for the other.

## Shared fixtures and validation

Fixtures in [`contracts/fixtures/`](../contracts/fixtures/README.md) are the backend/frontend compatibility examples. They preserve actual measurement values from the committed result artifacts; query windows/status scenarios are illustrative unless the fixture README says otherwise. Validate with:

```powershell
cd backend
uv sync --locked --dev
uv run --locked python ../scripts/validate_contract.py
```

The validator checks Draft 2020-12 schema validity, JSON parsing and formats, cross-field consistency, and rejection cases. CI runs it. Scientific input fixtures remain separate from API response fixtures.

## Change control

The schema is shared contract authority. A schema change requires review from frontend, backend, and scientific owners. Update the relevant fixtures and validator in the same change, document migration/compatibility impact, and do not independently rename JSON fields in one consumer. See [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) and [`INTEGRATION_GUIDELINES.md`](INTEGRATION_GUIDELINES.md).
