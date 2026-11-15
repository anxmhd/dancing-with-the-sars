import { useMemo } from "react";
import type { MultisensorResponse, SensorStatus } from "../api/types";

interface ObservationResultsProps {
  data: MultisensorResponse | null;
  loading: boolean;
  error: Error | null;
}

function statusExplanation(status: SensorStatus): string {
  switch (status) {
    case "available":
      return "At least one numeric measurement passed the declared quality policy.";
    case "noObservations":
      return "No candidate acquisitions were found in the selected range.";
    case "noValidObservations":
      return "Acquisitions were found, but no measurements passed the quality policy.";
    case "unavailable":
      return "Source availability or coverage could not be established.";
  }
}

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

export function ObservationResults({ data, loading, error }: ObservationResultsProps) {
  const observations = useMemo(() => {
    if (!data) return [];
    return [...data.observations].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt));
  }, [data]);

  if (loading) {
    return <section className="results-panel" aria-live="polite"><p className="field-hint">Loading observations…</p></section>;
  }

  if (error) {
    return (
      <section className="results-panel" role="alert">
        <p className="date-error">{error.message}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="results-panel">
        <p className="field-hint">Retrieve observations to view scientific results.</p>
      </section>
    );
  }

  return (
    <section className="results-panel" aria-labelledby="results-title">
      <div className="page-heading" style={{ marginBottom: "0.75rem" }}>
        <div>
          <div className="eyebrow">RESULTS</div>
          <h3 id="results-title">Mission availability and acquisitions</h3>
          <p>
            Parcel {data.parcelId} · {data.query.startDate} to {data.query.endDate}
          </p>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-kicker">MISSION AVAILABILITY</div>
        <ul className="sensor-status-list">
          {data.sensorResults.map((result) => (
            <li key={result.mission}>
              <strong>{result.mission}</strong>: {result.status} ({result.observationCount} acquisition
              {result.observationCount === 1 ? "" : "s"}) — {statusExplanation(result.status)}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel-section">
        <div className="section-kicker">ACQUISITIONS</div>
        {observations.length === 0 && <p className="field-hint">No observations were returned for this query.</p>}
        <div className="observation-list">
          {observations.map((obs) => (
            <article key={`${obs.mission}-${obs.acquiredAt}`} className="observation-card">
              <header>
                <strong>{obs.mission}</strong> · {obs.instrument}
              </header>
              <p className="field-hint">
                Acquisition date: {obs.observationDate} · timestamp: {obs.acquiredAt} · platform: {obs.platform}
              </p>

              <div className="measurement-section">
                <div className="section-kicker">MEASUREMENTS</div>
                <ul>
                  {obs.measurements.map((measurement, index) => (
                    <li key={`${measurement.quantity}-${measurement.polarization ?? ""}-${measurement.statistic ?? ""}-${index}`}>
                      <strong>{measurement.quantity}</strong>
                      {measurement.polarization ? ` (${measurement.polarization})` : ""}
                      {measurement.frequency ? ` · ${measurement.frequency}` : ""}
                      {measurement.frequencyBand ? ` · ${measurement.frequencyBand} band` : ""}
                      {measurement.frequencyHz ? ` · ${(measurement.frequencyHz / 1e9).toFixed(3)} GHz` : ""}:{" "}
                      {measurement.value === null ? "No valid value" : measurement.value} {measurement.unit}
                      {" · statistic: "}
                      {measurement.statistic ?? "n/a"}
                      {" · representation: "}
                      {measurement.representation}
                      {measurement.unitStatus ? ` · unit status: ${measurement.unitStatus}` : ""}
                      {typeof measurement.processing?.method === "string" ? ` · method: ${measurement.processing.method}` : ""}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="quality-section">
                <div className="section-kicker">QUALITY</div>
                {obs.measurements.map((measurement, index) => (
                  <div key={`quality-${index}`} className="quality-block">
                    <p>
                      {measurement.quantity}
                      {measurement.polarization ? ` (${measurement.polarization})` : ""}:{" "}
                      {measurement.quality?.status ?? "unknown"}; valid pixels {measurement.quality?.validPixelCount ?? "n/a"} /{" "}
                      {measurement.quality?.totalPixelCount ?? "n/a"}; coverage{" "}
                      {formatPercent(measurement.quality?.validPixelFraction)}.
                    </p>
                    {Array.isArray(measurement.quality?.reasons) && measurement.quality.reasons.length > 0 && (
                      <p className="field-hint">Reasons: {measurement.quality.reasons.join("; ")}</p>
                    )}
                    {Array.isArray(measurement.quality?.flags) && measurement.quality.flags.length > 0 && (
                      <p className="field-hint">Flags: {measurement.quality.flags.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="spatial-section">
                <div className="section-kicker">SPATIAL INFORMATION</div>
                {obs.measurements.map((measurement, index) => (
                  <p key={`grid-${index}`}>
                    {measurement.quantity}
                    {measurement.polarization ? ` (${measurement.polarization})` : ""}: grid resolution{" "}
                    {Array.isArray(measurement.grid?.resolution) ? measurement.grid.resolution.join(" × ") : "n/a"}{" "}
                    {measurement.grid?.resolutionUnit ?? ""}; CRS {measurement.grid?.crs ?? "n/a"}.
                  </p>
                ))}
              </div>

              <details className="provenance-section">
                <summary>Provenance and processing details</summary>
                <div className="provenance-grid">
                  <p><strong>Source dataset:</strong> {obs.source.dataset ?? "n/a"}</p>
                  <p><strong>Catalog provider:</strong> {obs.source.catalogProvider ?? "n/a"}</p>
                  <p><strong>Catalog item ID:</strong> {obs.source.catalogItemId ?? "n/a"}</p>
                  <p><strong>Source product identifier:</strong> {obs.source.sourceProductIdentifier ?? "n/a"}</p>
                  <p><strong>Catalog URL:</strong> {obs.source.catalogUrl ?? "n/a"}</p>
                  <p><strong>Processing version:</strong> {obs.source.processingVersion ?? "n/a"}</p>
                  <p><strong>Processing date/time:</strong> {obs.source.processingDateTime ?? "n/a"}</p>
                  <p><strong>Product type:</strong> {obs.source.productType ?? "n/a"}</p>
                  <p><strong>Processing level:</strong> {obs.source.processingLevel ?? "n/a"}</p>
                  <p><strong>Source processing note:</strong> {obs.source.sourceProcessingNote ?? "n/a"}</p>
                </div>
                {obs.limitations.length > 0 && (
                  <div>
                    <div className="section-kicker">LIMITATIONS</div>
                    <ul>
                      {obs.limitations.map((limitation, index) => (
                        <li key={index}>{limitation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </details>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
