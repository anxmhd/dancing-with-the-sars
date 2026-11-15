# Backend API handoff

## Endpoints

- `GET /api/v1/health` — service status.
- `GET /api/v1/parcels/{parcelId}` — source-backed parcel GeoJSON Feature (WGS 84).
- `GET /api/v1/parcels/{parcelId}/observations?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&missions=...` — canonical multisensor response.

`missions` is repeatable; allowed values: `Sentinel-2`, `Sentinel-1`, `NISAR`. Defaults to all three when omitted.

## Error format

```json
{ "error": { "code": "invalidRequest|parcelNotFound|internalError", "message": "...", "requestId": null } }
```

HTTP statuses: 400 invalid request, 404 unknown parcel, 500 unexpected failure.

## Response contract

Responses follow `contracts/multisensor-response.schema.json`. Sensor statuses: `available`, `noObservations`, `noValidObservations`, `unavailable`.

## Example

```
curl "http://localhost:8000/api/v1/parcels/el%20haouz_Trees_20240110_036/observations?startDate=2026-10-01&endDate=2026-11-30&missions=Sentinel-1&missions=Sentinel-2"
```
