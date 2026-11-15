import type { Measurement, Observation } from "./types";

type Props = {
  observation: Observation | null;
  measurement: Measurement | null;
  parcelId: string;
};

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function formatValue(value: number): string {
  return Math.abs(value) < 0.01 ? value.toPrecision(3) : value.toFixed(4);
}

export function AcquisitionDetail({ observation, measurement, parcelId }: Props) {
  if (!observation || !measurement) {
    return <div className="acquisition-detail-empty">Select a chart point to inspect that measurement.</div>;
  }

  const channel = [measurement.frequencyBand, measurement.frequency, measurement.polarization]
    .filter(Boolean)
    .join(" · ");
  const coverage =
    measurement.quality.validPixelCount !== null && measurement.quality.totalPixelCount !== null
      ? `${measurement.quality.validPixelCount.toLocaleString()} / ${measurement.quality.totalPixelCount.toLocaleString()}`
      : "Not available";
  const resolution = measurement.grid.resolution
    .map((value) => `${value} ${measurement.grid.resolutionUnit}`)
    .join(" × ");

  return (
    <article className="acquisition-detail" aria-live="polite">
      <header className="selected-measurement-heading">
        <div>
          <p className="eyebrow">{observation.mission}{channel ? ` · ${channel}` : ""} · {observation.observationDate}</p>
          <h3>{measurement.quantity === "NDVI" ? "Vegetation index" : "Gamma-zero backscatter"}</h3>
        </div>
        <p className="selected-measurement-value">
          {formatValue(measurement.value!)} <span>{measurement.unit}</span>
        </p>
      </header>
      <p className="selected-measurement-source">
        {parcelId} · {observation.instrument} · {formatTimestamp(observation.acquiredAt)} UTC
      </p>
      <dl className="measurement-meta selected-measurement-meta">
        <div><dt>Statistic</dt><dd>{measurement.statistic}</dd></div>
        <div><dt>Quality</dt><dd>{measurement.quality.status}</dd></div>
        <div><dt>Valid pixels</dt><dd>{coverage}</dd></div>
        <div><dt>Grid</dt><dd>{resolution} · {measurement.grid.crs}</dd></div>
        <div><dt>Representation</dt><dd>{measurement.representation === "linearPower" ? "Linear power (not dB)" : measurement.representation}</dd></div>
        <div><dt>Unit status</dt><dd>{measurement.unitStatus}</dd></div>
      </dl>
      {measurement.quality.reasons.length > 0 && (
        <p className="quality-reason">{measurement.quality.reasons.join(" ")}</p>
      )}
      <details className="provenance selected-provenance">
        <summary>Provenance and limitations</summary>
        <dl className="provenance-list">
          <div><dt>Dataset</dt><dd>{observation.source.dataset}</dd></div>
          <div><dt>Source product</dt><dd>{observation.source.sourceProductIdentifier ?? "Not recorded"}</dd></div>
          <div><dt>Catalog item</dt><dd>{observation.source.catalogItemId ?? "Not recorded"}</dd></div>
          <div><dt>Provider</dt><dd>{observation.source.catalogProvider ?? "Not recorded"}</dd></div>
          <div><dt>Processing version</dt><dd>{observation.source.processingVersion ?? "Not recorded"}</dd></div>
          {observation.source.sourceProcessingNote && (
            <div><dt>Provenance note</dt><dd>{observation.source.sourceProcessingNote}</dd></div>
          )}
        </dl>
        {observation.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}
      </details>
    </article>
  );
}
