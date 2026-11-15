import type { Observation } from "./types";

type Props = { observation: Observation | null };

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(new Date(timestamp));
}

export function AcquisitionDetail({ observation }: Props) {
  if (!observation) {
    return <div className="state-card">Select a chart point to inspect an acquisition.</div>;
  }
  return (
    <article className="acquisition-detail">
      <header>
        <p className="eyebrow">{observation.mission} · {observation.instrument}</p>
        <h3>{observation.observationDate}</h3>
        <time dateTime={observation.acquiredAt}>{formatTimestamp(observation.acquiredAt)} UTC</time>
      </header>
      <dl>
        <div><dt>Parcel</dt><dd>{observation.source.sourceProductIdentifier ?? "not recorded"}</dd></div>
        <div><dt>Product</dt><dd>{observation.source.dataset}</dd></div>
        <div><dt>Product id</dt><dd>{observation.source.sourceProductIdentifier ?? "Not recorded"}</dd></div>
        <div><dt>Catalog item</dt><dd>{observation.source.catalogItemId ?? "Not recorded"}</dd></div>
      </dl>
      <div className="measurement-grid">
        {observation.measurements.map((measurement, index) => {
          const coverage =
            measurement.quality.validPixelCount !== null && measurement.quality.totalPixelCount !== null
              ? `${measurement.quality.validPixelCount} / ${measurement.quality.totalPixelCount} valid pixels`
              : "Pixel coverage unavailable";
          const channel = [measurement.frequencyBand, measurement.frequency, measurement.polarization].filter(Boolean).join(" · ");
          const resolution = measurement.grid.resolution.map((value) => `${value} ${measurement.grid.resolutionUnit}`).join(" × ");
          return (
            <div className="measurement-card" key={index}>
              <p className="eyebrow">{channel || measurement.quantity}</p>
              <p className="measurement-value">
                {measurement.value === null ? "No valid value" : measurement.value < 0.01 ? measurement.value.toPrecision(3) : measurement.value.toFixed(3)}
                {measurement.value !== null && <span> {measurement.unit}</span>}
              </p>
              <dl className="measurement-meta">
                <div><dt>Quality</dt><dd>{measurement.quality.status}</dd></div>
                <div><dt>Coverage</dt><dd>{coverage}</dd></div>
                <div><dt>Grid</dt><dd>{resolution} · {measurement.grid.crs}</dd></div>
                <div><dt>Statistic</dt><dd>{measurement.statistic}</dd></div>
              </dl>
              {measurement.quality.reasons.length > 0 && <p className="quality-reason">{measurement.quality.reasons.join(" ")}</p>}
            </div>
          );
        })}
      </div>
      <details className="provenance">
        <summary>Provenance and limits</summary>
        <dl className="provenance-list">
          <div><dt>Dataset</dt><dd>{observation.source.dataset}</dd></div>
          <div><dt>Provider</dt><dd>{observation.source.catalogProvider ?? "Not recorded"}</dd></div>
          <div><dt>Processing version</dt><dd>{observation.source.processingVersion ?? "Not recorded"}</dd></div>
          {observation.source.sourceProcessingNote && <div><dt>Note</dt><dd>{observation.source.sourceProcessingNote}</dd></div>}
        </dl>
        {observation.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}
      </details>
      <p className="imagery-note">Associated acquisition imagery: not available locally (source rasters are not stored in this repository).</p>
    </article>
  );
}
