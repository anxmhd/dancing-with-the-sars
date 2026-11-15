import { useEffect, useMemo, useState } from "react";
import { fetchObservations, fetchParcels } from "./api";
import { ParcelMap } from "./ParcelMap";
import { ChartPanel, type ChartPoint } from "./charts";
import { ndviSeries, nisarSeries, sentinel1Series } from "./chartData";
import { AcquisitionDetail } from "./acquisitionDetail";
import type {
  Observation,
  ObservationResponse,
  ParcelFeatureCollection,
  SensorResult,
} from "./types";

const DEFAULT_START = "2026-08-14";
const DEFAULT_END = "2026-11-06";
const DEFAULT_PARCEL_ID = "el haouz_Trees_20240110_026";
const ALL_MISSIONS: Observation["mission"][] = ["Sentinel-2", "Sentinel-1", "NISAR"];

type QueryState = { startDate: string; endDate: string; missions: string[]; parcelId: string };

function statusLabel(status: SensorResult["status"]): string {
  switch (status) {
    case "available":
      return "Values available";
    case "noObservations":
      return "No acquisitions found";
    case "noValidObservations":
      return "Acquisitions excluded by quality";
    case "unavailable":
      return "Source coverage unavailable";
  }
}

function SensorStatus({ result, observations }: { result: SensorResult; observations: Observation[] }) {
  const missionObservations = observations.filter((observation) => observation.mission === result.mission);
  const accepted = missionObservations.filter((observation) =>
    observation.measurements.some((measurement) => measurement.quality.status === "accepted" && measurement.value !== null),
  ).length;
  const excluded = missionObservations.filter((observation) =>
    observation.measurements.some((measurement) => measurement.quality.status === "excluded"),
  ).length;
  return (
    <div className="sensor-status-row">
      <span className="sensor-name">{result.mission}</span>
      <span className={`status-dot dot-${result.status}`} aria-hidden="true" />
      <span className={`sensor-status status-${result.status}`}>{statusLabel(result.status)}</span>
      <span className="observation-count">
        {accepted} accepted{excluded > 0 ? ` · ${excluded} excluded` : ""} · {result.observationCount} acquisition{result.observationCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export function ResultsPanel({
  loading,
  error,
  response,
}: {
  loading: boolean;
  error: string | null;
  response: ObservationResponse | null;
}) {
  if (loading) return <div className="state-card" role="status">Loading local satellite observations…</div>;
  if (error) return <div className="state-card state-error" role="alert"><strong>Could not load observations</strong><p>{error}</p></div>;
  if (!response) return <div className="state-card">Choose a parcel and date window to inspect observations.</div>;

  const hasAvailableSensor = response.sensorResults.some((result) => result.status === "available");
  const hasPartialSensor = response.sensorResults.some((result) => result.status !== "available");
  return (
    <>
      <div className="sensor-status-list" aria-label="Per-sensor availability">
        {response.sensorResults.map((result) => (
          <SensorStatus key={result.mission} result={result} observations={response.observations} />
        ))}
      </div>
      {response.observations.length === 0 ? (
        <div className="state-card state-empty">
          <strong>No local processed observations in this window</strong>
          <p>The app has no indexed product covering these dates. This is not evidence that the satellites made no acquisitions.</p>
          <p>{response.sensorResults.filter((result) => result.status === "unavailable").map((result) => `${result.mission}: ${statusLabel(result.status)}`).join(" · ")}</p>
        </div>
      ) : (
        <p className="chart-selection-hint">Select a chart point to see its measurement and provenance.</p>
      )}
      {hasAvailableSensor && hasPartialSensor && (
        <p className="partial-result-note">Some acquisitions are missing or quality-excluded. Only accepted values are plotted.</p>
      )}
    </>
  );
}

export type GuidedDemoStep = {
  id: string;
  title: string;
  measureLabel: string;
  explanation: string;
  point: ChartPoint | null;
};

export function GuidedDemo({
  steps,
  selectedPointKey,
  onSelect,
  disabled,
}: {
  steps: GuidedDemoStep[];
  selectedPointKey: string | null;
  onSelect: (point: ChartPoint) => void;
  disabled: boolean;
}) {
  return (
    <section className="guided-demo" aria-labelledby="guided-demo-title">
      <div className="guided-demo-heading">
        <div>
          <p className="eyebrow">A SHORT PARCEL WALKTHROUGH</p>
          <h2 id="guided-demo-title">Follow the observations</h2>
        </div>
        <p>Choose a step to inspect a real chart point and its quality details.</p>
      </div>
      <div className="guided-demo-steps">
        {steps.map((step, index) => (
          <article className="guided-demo-step" key={step.id}>
            <p className="guided-demo-index">0{index + 1} / {steps.length}</p>
            <h3>{step.title}</h3>
            <p className="guided-demo-explanation">{step.explanation}</p>
            {step.point ? (
              <button
                type="button"
                className="guided-demo-action"
                aria-pressed={selectedPointKey === step.point.key}
                disabled={disabled}
                onClick={() => onSelect(step.point!)}
              >
                {step.measureLabel} · {step.point.observation.observationDate} · {step.point.value.toPrecision(4)} {step.point.measurement.unit}
              </button>
            ) : (
              <p className="guided-demo-unavailable">No accepted measurement for this step in the current selection.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function earliestPoint(points: ChartPoint[]): ChartPoint | null {
  return [...points].sort((a, b) => a.observation.observationDate.localeCompare(b.observation.observationDate))[0] ?? null;
}

function latestPoint(points: ChartPoint[]): ChartPoint | null {
  return [...points].sort((a, b) => a.observation.observationDate.localeCompare(b.observation.observationDate)).at(-1) ?? null;
}

export function App() {
  const [parcels, setParcels] = useState<ParcelFeatureCollection | null>(null);
  const [parcelError, setParcelError] = useState<string | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(DEFAULT_END);
  const [selectedMissions, setSelectedMissions] = useState<string[]>(ALL_MISSIONS);
  const [query, setQuery] = useState<QueryState>({
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    missions: ALL_MISSIONS,
    parcelId: "",
  });
  const [response, setResponse] = useState<ObservationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ChartPoint | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchParcels(controller.signal)
      .then((collection) => {
        setParcels(collection);
        const preferredParcel = collection.features.find(
          (feature) => feature.properties.parcel_id === DEFAULT_PARCEL_ID,
        );
        const initialParcelId = preferredParcel?.properties.parcel_id ?? collection.features[0]?.properties.parcel_id ?? "";
        setSelectedParcelId(initialParcelId);
        setQuery((current) => ({ ...current, parcelId: initialParcelId }));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setParcelError(reason instanceof Error ? reason.message : "Parcel data is unavailable.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!query.parcelId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedPoint(null);
    fetchObservations(query.parcelId, query.startDate, query.endDate, query.missions, controller.signal)
      .then((data) => {
        setResponse(data);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "An unexpected request error occurred.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  const selectedParcel = useMemo(
    () => parcels?.features.find((feature) => feature.properties.parcel_id === selectedParcelId) ?? null,
    [parcels, selectedParcelId],
  );

  const observations = response?.observations ?? [];
  const ndviChartSeries = useMemo(() => ndviSeries(observations), [observations]);
  const s1ChartSeries = useMemo(() => sentinel1Series(observations), [observations]);
  const nisarASeries = useMemo(() => nisarSeries(observations, "A"), [observations]);
  const nisarBSeries = useMemo(() => nisarSeries(observations, "B"), [observations]);
  const guidedSteps: GuidedDemoStep[] = [
    {
      id: "vegetation",
      title: "Vegetation timeline",
      measureLabel: "NDVI (unit 1)",
      explanation: "NDVI is a vegetation index; by itself, it does not diagnose crop stress.",
      point: earliestPoint(ndviChartSeries.flatMap((series) => series.points)),
    },
    {
      id: "sentinel-1",
      title: "C-band radar context",
      measureLabel: "Sentinel-1 VV median",
      explanation: "C-band backscatter is linear power (not dB) and is not a direct soil-moisture reading.",
      point: latestPoint(s1ChartSeries.find((series) => series.id === "vv")?.points ?? []),
    },
    {
      id: "nisar",
      title: "NISAR snapshot",
      measureLabel: "NISAR frequency A · HH",
      explanation: "L-band backscatter is linear power; one NISAR date cannot show a time trend.",
      point: earliestPoint(nisarASeries.find((series) => series.id === "nisar-A-hh")?.points ?? []),
    },
  ];

  function toggleMission(mission: string) {
    setSelectedMissions((current) => {
      if (current.includes(mission)) {
        return current.length === 1 ? current : current.filter((item) => item !== mission);
      }
      return [...current, mission];
    });
  }

  function selectParcel(parcelId: string) {
    setSelectedParcelId(parcelId);
    setSelectedPoint(null);
    if (selectedMissions.length > 0 && startDate <= endDate) {
      setQuery({ startDate, endDate, missions: selectedMissions, parcelId });
    }
  }

  function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedParcelId || selectedMissions.length === 0 || startDate > endDate) return;
    setQuery({ startDate, endDate, missions: selectedMissions, parcelId: selectedParcelId });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="Dancing with the SARs home">
          <span className="brand-mark" aria-hidden="true">D/S</span>
          <span><strong>Dancing with the SARs</strong><small>Earth observation · Haouz, Morocco</small></span>
        </a>
        <div className="topbar-note"><span className="live-indicator" /> Local research demo <span className="divider">/</span> v1</div>
      </header>

      <main id="overview">
        <section className="hero">
          <div>
            <p className="eyebrow">PARCEL OBSERVATORY <span>·</span> MULTISENSOR VIEW</p>
            <h1>Read the landscape,<br /><em>one acquisition at a time.</em></h1>
            <p className="hero-copy">Select a parcel to view its available measurements. Each dot is an acquisition; gaps are not interpolated.</p>
          </div>
          <div className="hero-badge"><span className="badge-orbit">◎</span><span><strong>3 sensors</strong><small>separate measurement scales</small></span></div>
        </section>

        <section className="workspace" aria-label="Parcel and satellite observations">
          <div className="map-column">
            <div className="section-heading">
              <div><p className="eyebrow">01 / LOCATION</p><h2>Selected parcel</h2></div>
              <span className="source-chip">Source-backed geometry</span>
            </div>
            <label className="parcel-selector">
              <span>Parcel</span>
              <select value={selectedParcelId} onChange={(event) => selectParcel(event.target.value)}>
                {parcels?.features.map((feature) => (
                  <option key={feature.properties.parcel_id} value={feature.properties.parcel_id}>
                    {feature.properties.parcel_id}
                  </option>
                ))}
              </select>
            </label>
            <div className="map-frame">
              {parcelError ? (
                <div className="map-message state-error" role="alert">Parcel geometry could not be loaded: {parcelError}</div>
              ) : !parcels ? (
                <div className="map-message" role="status">Loading parcel geometry…</div>
              ) : (
                <ParcelMap parcels={parcels} selectedParcelId={selectedParcelId} onSelect={selectParcel} />
              )}
              <div className="map-label"><span className="map-label-dot" /><span>{selectedParcelId || "Selected parcel"}</span></div>
            </div>
            <div className="parcel-card">
              <div className="parcel-icon" aria-hidden="true">⌖</div>
              <div className="parcel-details">
                <strong>{selectedParcel ? "El Haouz agricultural parcel" : "Parcel unavailable"}</strong>
                <span className="parcel-id">{selectedParcelId || "No parcel selected"}</span>
                {selectedParcel && <small>2024 survey reference: {selectedParcel.properties.source_record_crop_label ?? "not supplied"} · {selectedParcel.properties.source_record_irrigation_label ?? "not supplied"}; not current ground truth.</small>}
              </div>
              <span className="parcel-coordinates">EPSG:4326</span>
            </div>
            <p className="map-caption">Showing {parcels?.features.length ?? 0} source-backed parcel boundaries. No regional coverage boundary is established.</p>
          </div>

          <div className="results-column">
            <div className="section-heading">
              <div><p className="eyebrow">02 / OBSERVATIONS</p><h2>Acquisition record</h2></div>
              <span className="contract-chip">Contract v1.0</span>
            </div>
            <form className="query-controls" onSubmit={submitQuery}>
              <div className="date-controls">
                <label>From<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
                <label>To<input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
                <button type="submit" disabled={!selectedParcelId || selectedMissions.length === 0 || startDate > endDate}>Update view <span aria-hidden="true">→</span></button>
              </div>
              <fieldset className="mission-controls">
                <legend>Include sensors</legend>
                {ALL_MISSIONS.map((mission) => (
                  <label key={mission} className="mission-choice">
                    <input type="checkbox" checked={selectedMissions.includes(mission)} onChange={() => toggleMission(mission)} />
                    <span>{mission}</span>
                  </label>
                ))}
              </fieldset>
            </form>

            <ResultsPanel loading={loading} error={error} response={response} />
          </div>
        </section>

        <GuidedDemo
          steps={guidedSteps}
          selectedPointKey={selectedPoint?.key ?? null}
          onSelect={setSelectedPoint}
          disabled={loading}
        />

        <section className="charts-section" aria-label="Time series">
          <div className="section-heading">
            <div><p className="eyebrow">03 / TIME SERIES</p><h2>Measurements over time</h2></div>
            <span className="contract-chip">{query.startDate} — {query.endDate}</span>
          </div>
          <p className="chart-method-note">Each sensor keeps its own scale. This campaign has one processed NISAR acquisition date, so it does not show a NISAR time series.</p>
          <div className="charts-grid">
            <ChartPanel title="Sentinel-2" subtitle="NDVI" yLabel="NDVI (1)" series={ndviChartSeries} dateRange={query} onSelect={setSelectedPoint} selectedPointKey={selectedPoint?.key ?? null} />
            <ChartPanel title="Sentinel-1" subtitle="VV / VH · C-band" yLabel="gamma0 (linear power)" series={s1ChartSeries} dateRange={query} onSelect={setSelectedPoint} selectedPointKey={selectedPoint?.key ?? null} />
            <ChartPanel title="NISAR" subtitle="Frequency A · 20 m" yLabel="gamma0 (linear power)" series={nisarASeries} dateRange={query} onSelect={setSelectedPoint} selectedPointKey={selectedPoint?.key ?? null} />
            <ChartPanel title="NISAR" subtitle="Frequency B · 80 m" yLabel="gamma0 (linear power)" series={nisarBSeries} dateRange={query} onSelect={setSelectedPoint} selectedPointKey={selectedPoint?.key ?? null} />
          </div>
          <div className="acquisition-detail-wrapper">
            <AcquisitionDetail observation={selectedPoint?.observation ?? null} measurement={selectedPoint?.measurement ?? null} parcelId={selectedParcelId} />
          </div>
        </section>

      </main>

      <footer className="footer"><span>Dancing with the SARs <span className="footer-separator">·</span> Research prototype</span><span>Provenance and quality are shown with each observation.</span></footer>
    </div>
  );
}
