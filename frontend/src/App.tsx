import { useEffect, useMemo, useState } from "react";
import { fetchObservations, fetchParcels } from "./api";
import { ParcelMap } from "./ParcelMap";
import { ChartPanel } from "./charts";
import { ndviSeries, nisarSeries, sentinel1Series } from "./chartData";
import { AcquisitionDetail } from "./acquisitionDetail";
import { InterpretationPanel } from "./interpretationPanel";
import { ReferencesPanel } from "./referencesPanel";
import { ImageryStatus } from "./imageryStatus";
import type {
  Measurement,
  Observation,
  ObservationResponse,
  ParcelFeatureCollection,
  SensorResult,
} from "./types";

const DEFAULT_START = "2026-10-01";
const DEFAULT_END = "2026-11-30";
const ALL_MISSIONS: Observation["mission"][] = ["Sentinel-2", "Sentinel-1", "NISAR"];

type QueryState = { startDate: string; endDate: string; missions: string[]; parcelId: string };

function formatNumber(value: number): string {
  return value < 0.01 ? value.toPrecision(3) : value.toFixed(3);
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

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

function MeasurementCard({ measurement }: { measurement: Measurement }) {
  const quality = measurement.quality;
  const coverage =
    quality.validPixelCount !== null && quality.totalPixelCount !== null
      ? `${quality.validPixelCount} / ${quality.totalPixelCount} valid pixels`
      : "Pixel coverage unavailable";
  const channel = [measurement.frequencyBand, measurement.frequency, measurement.polarization]
    .filter(Boolean)
    .join(" · ");
  const resolution = measurement.grid.resolution.map((value) => `${value} ${measurement.grid.resolutionUnit}`).join(" × ");

  return (
    <article className={`measurement-card quality-${quality.status}`}>
      <div className="measurement-heading">
        <div>
          <p className="eyebrow">{channel || measurement.quantity}</p>
          <h4>{measurement.quantity === "NDVI" ? "Vegetation index" : "Backscatter"}</h4>
        </div>
        <span className={`quality-pill quality-pill-${quality.status}`}>{quality.status}</span>
      </div>
      <p className="measurement-value">
        {measurement.value === null ? "No valid value" : formatNumber(measurement.value)}
        {measurement.value !== null && <span> {measurement.unit}</span>}
      </p>
      <dl className="measurement-meta">
        <div><dt>Statistic</dt><dd>{measurement.statistic}</dd></div>
        <div><dt>Coverage</dt><dd>{coverage}</dd></div>
        <div><dt>Grid</dt><dd>{resolution} · {measurement.grid.crs}</dd></div>
        {measurement.representation === "linearPower" && (
          <div><dt>Representation</dt><dd>Linear gamma-zero power (not dB)</dd></div>
        )}
      </dl>
      {quality.reasons.length > 0 && (
        <p className="quality-reason">{quality.reasons.join(" ")}</p>
      )}
    </article>
  );
}

function ObservationCard({ observation }: { observation: Observation }) {
  return (
    <article className={`observation-card sensor-${observation.mission.toLowerCase().replaceAll("-", "")}`}>
      <header className="observation-header">
        <div>
          <p className="eyebrow">{observation.mission} · {observation.instrument}</p>
          <h3>{new Date(`${observation.observationDate}T00:00:00Z`).toLocaleDateString("en", {
            year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
          })}</h3>
        </div>
        <time dateTime={observation.acquiredAt}>{formatTimestamp(observation.acquiredAt)} UTC</time>
      </header>
      <div className="measurement-grid">
        {observation.measurements.map((measurement, index) => (
          <MeasurementCard key={`${measurement.quantity}-${measurement.frequency ?? measurement.frequencyBand ?? "optical"}-${measurement.polarization ?? "index"}-${measurement.statistic}-${index}`} measurement={measurement} />
        ))}
      </div>
      <details className="provenance">
        <summary>Source, processing and interpretation limits</summary>
        <dl className="provenance-list">
          <div><dt>Dataset</dt><dd>{observation.source.dataset}</dd></div>
          <div><dt>Source product</dt><dd>{observation.source.sourceProductIdentifier ?? "Not recorded"}</dd></div>
          <div><dt>Catalog item</dt><dd>{observation.source.catalogItemId ?? "Not recorded"}</dd></div>
          <div><dt>Provider</dt><dd>{observation.source.catalogProvider ?? "Not recorded in local product"}</dd></div>
          <div><dt>Product version</dt><dd>{observation.source.processingVersion ?? "Not recorded"}</dd></div>
          {observation.source.sourceProcessingNote && (
            <div><dt>Provenance note</dt><dd>{observation.source.sourceProcessingNote}</dd></div>
          )}
        </dl>
        {observation.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}
      </details>
    </article>
  );
}

function SensorStatus({ result }: { result: SensorResult }) {
  return (
    <div className="sensor-status-row">
      <span className="sensor-name">{result.mission}</span>
      <span className={`status-dot dot-${result.status}`} aria-hidden="true" />
      <span className={`sensor-status status-${result.status}`}>{statusLabel(result.status)}</span>
      <span className="observation-count">{result.observationCount} acquisition{result.observationCount === 1 ? "" : "s"}</span>
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const sortedObservations = useMemo(
    () => (response ? [...response.observations].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt)) : []),
    [response],
  );
  useEffect(() => {
    setFocusedIndex(0);
  }, [response]);

  if (loading) return <div className="state-card" role="status">Loading local satellite observations…</div>;
  if (error) return <div className="state-card state-error" role="alert"><strong>Could not load observations</strong><p>{error}</p></div>;
  if (!response) return <div className="state-card">Choose a parcel and date window to inspect observations.</div>;

  const resultsByMission = new Map(response.sensorResults.map((result) => [result.mission, result]));
  const hasAvailableSensor = response.sensorResults.some((result) => result.status === "available");
  const hasPartialSensor = response.sensorResults.some(
    (result) => result.status === "unavailable" || result.status === "noValidObservations",
  );
  const focusedObservation = sortedObservations[focusedIndex] ?? sortedObservations[0];
  return (
    <>
      <div className="sensor-status-list" aria-label="Per-sensor availability">
        {response.sensorResults.map((result) => <SensorStatus key={result.mission} result={result} />)}
      </div>
      {sortedObservations.length > 1 && (
        <div className="timeline-scrubber" aria-label="Acquisition timeline">
          <label className="timeline-label" htmlFor="acquisition-cursor">Acquisition cursor</label>
          <input
            id="acquisition-cursor"
            type="range"
            min={0}
            max={sortedObservations.length - 1}
            value={Math.min(focusedIndex, sortedObservations.length - 1)}
            onChange={(event) => setFocusedIndex(Number(event.target.value))}
          />
          <div className="timeline-ticks">
            {sortedObservations.map((observation, index) => (
              <button
                key={`${observation.mission}-${observation.acquiredAt}`}
                type="button"
                className={index === focusedIndex ? "timeline-tick active" : "timeline-tick"}
                onClick={() => setFocusedIndex(index)}
                title={`${observation.mission} ${observation.observationDate}`}
              >
                {observation.observationDate.slice(5)}
              </button>
            ))}
          </div>
          {focusedObservation && (
            <p className="timeline-caption">
              Focused: {focusedObservation.mission} · {new Date(`${focusedObservation.observationDate}T00:00:00Z`).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}
            </p>
          )}
        </div>
      )}
      {sortedObservations.length > 1 && focusedObservation && (
        <div className="focused-observation">
          <ObservationCard observation={focusedObservation} />
        </div>
      )}
      {response.observations.length === 0 ? (
        <div className="state-card state-empty">
          <strong>No local processed observations in this window</strong>
          <p>The app has no indexed product covering these dates. This is not evidence that the satellites made no acquisitions.</p>
          <p>{response.sensorResults.filter((result) => result.status === "unavailable").map((result) => `${result.mission}: ${statusLabel(result.status)}`).join(" · ")}</p>
        </div>
      ) : (
        <div className="observation-list">
          {response.observations.map((observation) => (
            <ObservationCard key={`${observation.mission}-${observation.source.sourceProductIdentifier}-${observation.acquiredAt}`} observation={observation} />
          ))}
        </div>
      )}
      {hasAvailableSensor && hasPartialSensor && (
        <div className="state-card state-partial">
          <strong>Partial multisensor result</strong>
          <p>At least one sensor has accepted values while another has missing or quality-excluded measurements. The measurements remain separate.</p>
        </div>
      )}
      {response.sensorResults.some((result) => result.status === "noObservations") && (
        <div className="state-card state-empty">
          <strong>Search completed with no candidate acquisitions</strong>
          <p>No matching acquisitions were returned by the queried source.</p>
        </div>
      )}
      {Array.from(resultsByMission.values()).some((result) => result.status === "noValidObservations") && (
        <div className="state-card state-partial">
          <strong>Acquisitions found, but quality rules excluded all parcel measurements</strong>
          <p>The excluded candidate records remain visible below with null values, coverage counts and quality reasons.</p>
        </div>
      )}
    </>
  );
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
    parcelId: "el haouz_Trees_20240110_036",
  });
  const [response, setResponse] = useState<ObservationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchParcels(controller.signal)
      .then((collection) => {
        setParcels(collection);
        const firstId = collection.features[0]?.properties.parcel_id ?? "";
        setSelectedParcelId(firstId);
        setQuery((current) => ({ ...current, parcelId: firstId }));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setParcelError(reason instanceof Error ? reason.message : "Parcel data is unavailable.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!query.parcelId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setResponse(null);
    fetchObservations(query.parcelId, query.startDate, query.endDate, query.missions, controller.signal)
      .then((data) => {
        setResponse(data);
        setSelectedObservation(null);
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

  function toggleMission(mission: string) {
    setSelectedMissions((current) =>
      current.includes(mission) ? current.filter((item) => item !== mission) : [...current, mission],
    );
  }

  function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedParcelId || selectedMissions.length === 0) return;
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
            <p className="hero-copy">Explore the available satellite observations for a source-backed agricultural parcel. Each sensor keeps its own measurement, quality and limitations.</p>
          </div>
          <div className="hero-badge"><span className="badge-orbit">◎</span><span><strong>3 sensors</strong><small>optical + C-band + L-band</small></span></div>
        </section>

        <section className="workspace" aria-label="Parcel and satellite observations">
          <div className="map-column">
            <div className="section-heading">
              <div><p className="eyebrow">01 / LOCATION</p><h2>Selected parcel</h2></div>
              <span className="source-chip">Source-backed geometry</span>
            </div>
            <label className="parcel-selector">
              <span>Parcel</span>
              <select value={selectedParcelId} onChange={(event) => setSelectedParcelId(event.target.value)}>
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
                <ParcelMap parcels={parcels} selectedParcelId={selectedParcelId} onSelect={setSelectedParcelId} />
              )}
              <div className="map-label"><span className="map-label-dot" /><span>El Haouz reference parcel</span></div>
            </div>
            <div className="parcel-card">
              <div className="parcel-icon" aria-hidden="true">⌖</div>
              <div className="parcel-details">
                <strong>{selectedParcel ? "El Haouz agricultural parcel" : "Parcel unavailable"}</strong>
                <span className="parcel-id">{selectedParcelId || "No parcel selected"}</span>
                {selectedParcel && <small>Source survey labels: {selectedParcel.properties.source_record_crop_label ?? "not supplied"} · {selectedParcel.properties.source_record_irrigation_label ?? "not supplied"} (2024 reference record; not current ground truth)</small>}
              </div>
              <span className="parcel-coordinates">EPSG:4326</span>
            </div>
            <p className="map-caption">One inspected parcel is available. A definitive Haouz regional boundary is not yet established; the outlined polygon is the source geometry, not a regional coverage boundary.</p>
          </div>

          <div className="results-column">
            <div className="section-heading">
              <div><p className="eyebrow">02 / OBSERVATIONS</p><h2>Acquisition record</h2></div>
              <span className="contract-chip">Contract v1.0</span>
            </div>
            <form className="query-controls" onSubmit={submitQuery}>
              <div className="date-controls">
                <label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
                <label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
                <button type="submit" disabled={!selectedParcelId || selectedMissions.length === 0}>Update view <span aria-hidden="true">→</span></button>
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

        <section className="charts-section" aria-label="Time series">
          <div className="section-heading">
            <div><p className="eyebrow">03 / TIME SERIES</p><h2>Independent measurement panels</h2></div>
            <span className="contract-chip">No interpolation</span>
          </div>
          <div className="charts-grid">
            <ChartPanel title="Sentinel-2" subtitle="NDVI" yLabel="NDVI (1)" series={ndviChartSeries} onSelect={setSelectedObservation} selectedAcquiredAt={selectedObservation?.acquiredAt ?? null} />
            <ChartPanel title="Sentinel-1" subtitle="VV / VH" yLabel="gamma0 (linear power)" series={s1ChartSeries} onSelect={setSelectedObservation} selectedAcquiredAt={selectedObservation?.acquiredAt ?? null} />
            <ChartPanel title="NISAR" subtitle="Frequency A (20 m)" yLabel="gamma0 (linear power)" series={nisarASeries} onSelect={setSelectedObservation} selectedAcquiredAt={selectedObservation?.acquiredAt ?? null} />
            <ChartPanel title="NISAR" subtitle="Frequency B (80 m)" yLabel="gamma0 (linear power)" series={nisarBSeries} onSelect={setSelectedObservation} selectedAcquiredAt={selectedObservation?.acquiredAt ?? null} />
          </div>
          <div className="acquisition-detail-wrapper">
            <AcquisitionDetail observation={selectedObservation} />
          </div>
        </section>

        <InterpretationPanel response={response} />
        <ReferencesPanel />
        <ImageryStatus />

        <section className="interpretation-band" aria-labelledby="interpretation-title">
          <div className="interpretation-intro"><p className="eyebrow">READING THE SIGNAL</p><h2 id="interpretation-title">Measurements need context.</h2><p>These are observations and derived indicators. They describe what the product records for this parcel, not a diagnosis of its cause.</p></div>
          <div className="interpretation-item"><span className="sensor-symbol optical">S2</span><div><strong>NDVI</strong><p>An indirect vegetation index. Alone it does not prove vegetation stress, irrigation, drought impact, crop health or groundwater conditions.</p></div></div>
          <div className="interpretation-item"><span className="sensor-symbol radar">S1</span><div><strong>C-band backscatter</strong><p>VV/VH gamma-zero depends on vegetation, moisture, roughness, geometry, polarization and processing. Values are shown as stored linear power.</p></div></div>
          <div className="interpretation-item"><span className="sensor-symbol radar">N</span><div><strong>L-band GCOV</strong><p>Complementary to Sentinel-1, not interchangeable. Current parcel candidates fail NISAR focus masks, so measurements remain null.</p></div></div>
        </section>
      </main>

      <footer className="footer"><span>Dancing with the SARs <span className="footer-separator">·</span> Research prototype</span><span>Provenance and quality are shown with each observation.</span></footer>
    </div>
  );
}
