import { useEffect, useMemo, useState } from "react";
import { ALL_MISSIONS, fetchParcel } from "../api/parcels";
import { useParcelObservations } from "../api/useParcelObservations";
import type { Mission, ParcelFeature, SensorStatus } from "../api/types";
import { ApiError } from "../api/errors";
import "./study-area.css";

const DEFAULT_START = "2026-10-01";
const DEFAULT_END = "2026-11-30";

function statusLabel(status: SensorStatus): string {
  switch (status) {
    case "available":
      return "Available";
    case "noObservations":
      return "No observations";
    case "noValidObservations":
      return "No valid observations";
    case "unavailable":
      return "Unavailable";
  }
}

function polygonPath(geometry: ParcelFeature["geometry"]): string | null {
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
    return null;
  }
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length === 0) return null;

  const points = ring
    .map((point) => (Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : null))
    .filter((point): point is [number, number] => point !== null);
  if (points.length === 0) return null;

  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1e-9);
  const height = Math.max(maxY - minY, 1e-9);
  const pad = 12;
  const size = 220;

  return points
    .map((point, index) => {
      const x = pad + ((point[0] - minX) / width) * (size - pad * 2);
      const y = size - pad - ((point[1] - minY) / height) * (size - pad * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

export function ParcelObservationPanel() {
  const [parcelId, setParcelId] = useState("el haouz_Trees_20240110_036");
  const [draftParcelId, setDraftParcelId] = useState("el haouz_Trees_20240110_036");
  const [fromDate, setFromDate] = useState(DEFAULT_START);
  const [toDate, setToDate] = useState(DEFAULT_END);
  const [selectedMissions, setSelectedMissions] = useState<Mission[]>(["Sentinel-2", "Sentinel-1", "NISAR"]);
  const [parcel, setParcel] = useState<ParcelFeature | null>(null);
  const [parcelError, setParcelError] = useState<ApiError | null>(null);
  const [parcelLoading, setParcelLoading] = useState(false);

  const dateRangeValid = fromDate <= toDate;

  const query = useMemo(() => ({
    startDate: fromDate,
    endDate: toDate,
    missions: selectedMissions.length > 0 ? selectedMissions : (["Sentinel-2"] as Mission[]),
  }), [fromDate, toDate, selectedMissions]);

  const observationsState = useParcelObservations(parcelId, query);

  useEffect(() => {
    let cancelled = false;
    setParcelLoading(true);
    setParcelError(null);
    fetchParcel(parcelId)
      .then((result) => {
        if (cancelled) return;
        setParcel(result);
        setParcelLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setParcelError(err instanceof ApiError ? err : new ApiError("internalError", "Unexpected error.", 0, null));
        setParcel(null);
        setParcelLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parcelId]);

  function toggleMission(mission: Mission) {
    setSelectedMissions((current) =>
      current.includes(mission) ? current.filter((item) => item !== mission) : [...current, mission],
    );
  }

  const path = useMemo(() => polygonPath(parcel?.geometry ?? null), [parcel]);

  return (
    <section className="parcel-obs-panel" aria-labelledby="parcel-obs-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">REAL DATA · 02</div>
          <h2 id="parcel-obs-title">Parcel observations</h2>
          <p>Source-backed parcel geometry and multisensor observations from the backend.</p>
        </div>
        <span className="mock-pill" style={{ background: "#e7f1e4", color: "#2f5d2f" }}>
          <i /> BACKEND DATA
        </span>
      </div>

      <div className="parcel-obs-controls">
        <label className="field-label" htmlFor="parcel-id-input">Parcel ID</label>
        <div className="select-wrap">
          <input
            id="parcel-id-input"
            type="text"
            value={draftParcelId}
            onChange={(event) => setDraftParcelId(event.target.value)}
            onBlur={() => setParcelId(draftParcelId.trim())}
            onKeyDown={(event) => {
              if (event.key === "Enter") setParcelId(draftParcelId.trim());
            }}
          />
        </div>

        <div className="date-fields">
          <div>
            <label className="field-label" htmlFor="real-from-date">From</label>
            <input id="real-from-date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} max={toDate} />
          </div>
          <span className="date-arrow">→</span>
          <div>
            <label className="field-label" htmlFor="real-to-date">To</label>
            <input id="real-to-date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} min={fromDate} />
          </div>
        </div>

        <fieldset className="mission-filter">
          <legend className="field-label">Missions</legend>
          {ALL_MISSIONS.map((mission) => (
            <label key={mission} className="mission-checkbox">
              <input
                type="checkbox"
                checked={selectedMissions.includes(mission)}
                onChange={() => toggleMission(mission)}
              />
              {mission}
            </label>
          ))}
        </fieldset>

        {!dateRangeValid && <p className="date-error" role="alert">The end date must be on or after the start date.</p>}
      </div>

      <div className="parcel-obs-grid">
        <div className="map-panel">
          <div className="map-toolbar">
            <div className="map-title"><span className="map-pin">⌖</span><span><strong>{parcelId}</strong><small>Source-backed parcel (EPSG:4326)</small></span></div>
          </div>
          <div className="map-stage">
            {parcelLoading && <p className="field-hint">Loading parcel…</p>}
            {parcelError && <p className="date-error" role="alert">{parcelError.message}</p>}
            {!parcelLoading && !parcelError && parcel && (
              <svg className="map-svg" viewBox="0 0 244 244" role="img" aria-label="Source-backed parcel polygon">
                <rect width="244" height="244" fill="#eeece2" />
                {path && <path d={path} fill="url(#parcel-hatch)" stroke="#728c66" strokeWidth="2" />}
                <text x="12" y="232" className="map-small">Source-backed geometry · not to scale</text>
              </svg>
            )}
            {!parcelLoading && !parcelError && !parcel && <p className="field-hint">No parcel geometry available.</p>}
          </div>
          {parcel?.properties && (
            <div className="map-footer">
              <span>{String(parcel.properties.source_record_crop_label ?? "Parcel")} · {String(parcel.properties.source_record_irrigation_label ?? "")}</span>
              <span>{String(parcel.properties.reference_source ?? "")}</span>
            </div>
          )}
        </div>

        <aside className="selection-panel" aria-label="Observation results">
          {observationsState.loading && <p className="field-hint">Loading observations…</p>}
          {observationsState.error && (
            <p className="date-error" role="alert">
              {observationsState.error.message} ({observationsState.error.code})
            </p>
          )}

          {observationsState.data && (
            <>
              <div className="panel-section">
                <div className="section-kicker">SENSOR STATUS</div>
                <ul className="sensor-status-list">
                  {observationsState.data.sensorResults.map((result) => (
                    <li key={result.mission}>
                      <strong>{result.mission}</strong>: {statusLabel(result.status)} ({result.observationCount})
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel-section">
                <div className="section-kicker">OBSERVATIONS</div>
                {observationsState.data.observations.length === 0 && <p className="field-hint">No observations in this range.</p>}
                <div className="observation-list">
                  {observationsState.data.observations.map((obs) => (
                    <article key={obs.acquiredAt + obs.mission} className="observation-card">
                      <header>
                        <strong>{obs.mission}</strong> · {obs.observationDate}
                      </header>
                      <p className="field-hint">{obs.platform} · {obs.instrument}</p>
                      <ul>
                        {obs.measurements.map((measurement, index) => (
                          <li key={`${measurement.quantity}-${index}`}>
                            {measurement.quantity}
                            {measurement.polarization ? ` (${measurement.polarization})` : ""}
                            {measurement.frequency ? ` freq ${measurement.frequency}` : ""}
                            {measurement.covarianceTerm ? ` · ${measurement.covarianceTerm}` : ""}:{" "}
                            {measurement.value === null ? "null" : measurement.value} {measurement.unit}
                            {" · "}
                            {measurement.quality?.status ?? "unknown"}
                          </li>
                        ))}
                      </ul>
                      {obs.limitations.length > 0 && (
                        <p className="field-hint">Limitations: {obs.limitations.join("; ")}</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
