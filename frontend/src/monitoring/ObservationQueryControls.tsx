import { useEffect, useState } from "react";
import { ALL_MISSIONS } from "../api/parcels";
import type { Mission, ObservationQuery } from "../api/types";

interface ObservationQueryControlsProps {
  parcelId: string | null;
  loading?: boolean;
  onApply: (query: ObservationQuery) => void;
}

const DEFAULT_START = "2026-10-01";
const DEFAULT_END = "2026-11-30";

export function ObservationQueryControls({ parcelId, loading, onApply }: ObservationQueryControlsProps) {
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [missions, setMissions] = useState<Mission[]>(["Sentinel-2", "Sentinel-1", "NISAR"]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (startDate > endDate) {
      setValidationError("End date must be on or after start date.");
    } else {
      setValidationError(null);
    }
  }, [startDate, endDate]);

  function toggleMission(mission: Mission) {
    setMissions((current) =>
      current.includes(mission) ? current.filter((item) => item !== mission) : [...current, mission],
    );
  }

  function handleApply() {
    if (!parcelId) {
      setValidationError("Select a parcel before retrieving observations.");
      return;
    }
    if (missions.length === 0) {
      setValidationError("Select at least one mission.");
      return;
    }
    if (startDate > endDate) {
      setValidationError("End date must be on or after start date.");
      return;
    }
    setValidationError(null);
    onApply({ startDate, endDate, missions });
  }

  const canApply = Boolean(parcelId) && missions.length > 0 && startDate <= endDate && !loading;

  return (
    <section className="query-controls" aria-labelledby="query-controls-title">
      <div className="section-kicker">OBSERVATION QUERY</div>
      <h3 id="query-controls-title">Filter scientific observations</h3>

      <div className="query-grid">
        <div>
          <label className="field-label" htmlFor="selected-parcel">Parcel</label>
          <input id="selected-parcel" type="text" value={parcelId ?? ""} readOnly placeholder="Select a parcel on the map" />
        </div>

        <div>
          <label className="field-label" htmlFor="query-start">Start date</label>
          <input id="query-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} max={endDate} />
        </div>

        <div>
          <label className="field-label" htmlFor="query-end">End date</label>
          <input id="query-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate} />
        </div>
      </div>

      <fieldset className="mission-filter">
        <legend className="field-label">Missions</legend>
        {ALL_MISSIONS.map((mission) => (
          <label key={mission} className="mission-checkbox">
            <input
              type="checkbox"
              checked={missions.includes(mission)}
              onChange={() => toggleMission(mission)}
            />
            {mission}
          </label>
        ))}
      </fieldset>

      {validationError && <p className="date-error" role="alert">{validationError}</p>}

      <button type="button" className="primary-button" onClick={handleApply} disabled={!canApply}>
        {loading ? "Loading…" : "Retrieve observations"}
      </button>
    </section>
  );
}
