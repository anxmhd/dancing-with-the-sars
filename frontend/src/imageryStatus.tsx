export function ImageryStatus() {
  return (
    <section className="imagery-panel">
      <div className="section-heading">
        <div><p className="eyebrow">05 / IMAGERY</p><h2>Satellite acquisition imagery</h2></div>
        <span className="contract-chip">Unavailable</span>
      </div>
      <div className="state-card state-empty">
        <strong>No acquisition raster previews are available locally</strong>
        <p>
          The 49 JSON artifacts contain parcel-level summaries, not pixel-level satellite data. Acquisition rasters (Sentinel-2
          true/false color and NDVI, Sentinel-1 VV/VH, NISAR frequency A/B HH/HV) are not stored in this repository and are not
          reconstructed from summary values.
        </p>
        <p>
          To enable imagery, provide locally accessible source products (Sentinel-2 L2A, Sentinel-1 RTC, NISAR L2 GCOV) and an
          imagery generation step that preserves CRS, resolution, masking, and provenance. The dashboard surfaces measurement
          metadata only until then.
        </p>
      </div>
    </section>
  );
}
