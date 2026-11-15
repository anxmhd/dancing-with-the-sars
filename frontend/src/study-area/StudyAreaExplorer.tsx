import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { SYNTHETIC_AREAS } from "./synthetic-areas";
import type { StudyArea } from "./synthetic-areas";
import "./study-area.css";

const ANALYSES = [
  { value: "ndvi", label: "Vegetation index · NDVI" },
  { value: "sar", label: "Radar backscatter · Sentinel-1" },
  { value: "climate", label: "Climate context · CHIRPS / ERA5-Land" },
] as const;

export function StudyAreaExplorer() {
  const { user, logout } = useAuth();
  const [selectedId, setSelectedId] = useState(SYNTHETIC_AREAS[1].id);
  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState("2025-12-31");
  const [analysis, setAnalysis] = useState<(typeof ANALYSES)[number]["value"]>("ndvi");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null);
  const [selectionSaved, setSelectionSaved] = useState(false);
  const mapRef = useRef<SVGSVGElement>(null);

  const selectedArea = useMemo(
    () => SYNTHETIC_AREAS.find((area) => area.id === selectedId) ?? SYNTHETIC_AREAS[0],
    [selectedId],
  );
  const dateRangeValid = fromDate <= toDate;

  function chooseArea(id: string) {
    setSelectedId(id);
    setSelectionSaved(false);
  }

  const zoomBy = useCallback((amount: number) => {
    setZoom((current) => Math.max(0.85, Math.min(2.2, Number((current + amount).toFixed(2)))));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleMapWheel = (event: WheelEvent) => {
      if (!event.altKey) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? 0.08 : -0.08);
    };
    map.addEventListener("wheel", handleMapWheel, { passive: false });
    return () => map.removeEventListener("wheel", handleMapWheel);
  }, [zoomBy]);

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest("[data-area]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragOrigin({ x: event.clientX - offset.x, y: event.clientY - offset.y });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragOrigin) return;
    setOffset({ x: event.clientX - dragOrigin.x, y: event.clientY - dragOrigin.y });
  }

  return (
    <main className="researcher-app">
      <aside className="sidebar" aria-label="Researcher navigation">
        <a className="brand" href="#explorer" aria-label="Dancing with the SARs home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-name">Dancing with<br />the SARs</span>
        </a>
        <div className="workspace-label">RESEARCH WORKSPACE</div>
        <nav>
          <a className="nav-link active" href="#explorer" aria-current="page"><span aria-hidden="true">⌖</span> Study area</a>
          <span className="nav-link disabled" aria-disabled="true"><span aria-hidden="true">◌</span> Vegetation</span>
          <span className="nav-link disabled" aria-disabled="true"><span aria-hidden="true">⌁</span> SAR observatory</span>
          <span className="nav-link disabled" aria-disabled="true"><span aria-hidden="true">⇄</span> Multi-sensor</span>
          <Link className="nav-link" to="/tickets"><span aria-hidden="true">▤</span> Community observations</Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="location-mini"><span className="location-dot" /> MOROCCO<br /><strong>Haouz Plain</strong></div>
          <div className="sidebar-profile"><span className="avatar">{user?.fullName.charAt(0) ?? "R"}</span><span><strong>{user?.fullName ?? "Researcher"}</strong><small>Researcher workspace</small></span><button className="profile-logout" type="button" onClick={() => void logout()} aria-label="Sign out"><span aria-hidden="true">↗</span><span className="profile-logout-text">Sign out</span></button></div>
        </div>
      </aside>

      <section className="main-column" id="explorer">
        <header className="topbar">
          <div className="breadcrumbs"><span>Research</span><span className="crumb-divider">/</span><strong>Study area explorer</strong></div>
          <div className="topbar-actions"><span className="workspace-status"><i /> Synthetic workspace</span><button className="help-button" aria-label="Help">?</button></div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow">FIELDWORK · 01</div><h1>Study area explorer</h1><p>Choose an area and set the time window for your research.</p></div>
            <span className="mock-pill"><i /> MOCK DATA</span>
          </div>

          <div className="workflow-steps" aria-label="Research workflow">
            <div className="step current"><span>01</span> Study area</div><div className="step-line" />
            <div className="step future"><span>02</span> Observation</div><div className="step-line" />
            <div className="step future"><span>03</span> Interpretation</div><div className="step-line" />
            <div className="step future"><span>04</span> Review</div>
          </div>

          <section className="explorer-grid" aria-label="Study area selection">
            <div className="map-panel">
              <div className="map-toolbar">
                <div className="map-title"><span className="map-pin">⌖</span><span><strong>Haouz Plain</strong><small>Marrakech-Safi, Morocco</small></span></div>
                <div className="map-tools"><span className="map-layer"><span className="layer-icon">▦</span> Schematic view <span className="chevron">⌄</span></span><div className="zoom-control"><button aria-label="Zoom in" onClick={() => zoomBy(0.15)}>+</button><button aria-label="Zoom out" onClick={() => zoomBy(-0.15)}>−</button></div></div>
              </div>
              <div className="map-stage">
                <svg ref={mapRef} className="map-svg" viewBox="0 0 560 390" role="group" aria-label="Schematic map of synthetic study areas in the Haouz Plain. Select a shape to choose it; drag to pan, use the plus and minus buttons to zoom, or hold Alt while scrolling over the map." onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={() => setDragOrigin(null)} onPointerCancel={() => setDragOrigin(null)}>
                  <defs>
                    <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d8d5c8" strokeWidth=".6" /></pattern>
                    <pattern id="parcel-hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="7" stroke="#728c66" strokeWidth="1" opacity=".22" /></pattern>
                  </defs>
                  <rect width="560" height="390" fill="#eeece2" />
                  <rect width="560" height="390" fill="url(#map-grid)" />
                  <g transform={`translate(${offset.x} ${offset.y}) translate(280 195) scale(${zoom}) translate(-280 -195)`}>
                    <path d="M-20 300 C80 278 112 312 170 296 S270 283 335 300 450 326 590 288" fill="none" stroke="#d2cbb7" strokeWidth="13" />
                    <path d="M-20 300 C80 278 112 312 170 296 S270 283 335 300 450 326 590 288" fill="none" stroke="#faf9f4" strokeWidth="8" />
                    <path d="M43 53 C105 70 151 39 212 61 S327 74 370 53 480 44 531 66" fill="none" stroke="#d6d3c8" strokeWidth="1.2" />
                    <path d="M24 79 C87 94 154 65 217 86 S322 99 388 77 474 73 548 91" fill="none" stroke="#d6d3c8" strokeWidth="1.2" />
                    <path d="M28 355 C100 330 156 362 216 342 S339 339 389 357 495 363 555 335" fill="none" stroke="#d6d3c8" strokeWidth="1.2" />
                    <g aria-label="Marrakech reference label"><circle cx="315" cy="212" r="4" fill="#8f6655"/><text x="325" y="217" className="map-label city-label">MARRAKECH</text></g>
                    <text x="47" y="45" className="map-label map-region">HAOUZ PLAIN</text>
                    <text x="417" y="352" className="map-small">SCHEMATIC · NOT TO SCALE</text>
                    {SYNTHETIC_AREAS.map((area: StudyArea) => {
                      const selected = selectedId === area.id;
                      return <g key={area.id} data-area="true" className={`area-shape ${selected ? "selected" : ""}`} role="button" tabIndex={0} aria-label={`Select ${area.name}, ${area.type.toLowerCase()}`} aria-pressed={selected} onClick={() => chooseArea(area.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseArea(area.id); } }}>
                        <path d={area.path} className="area-fill" />
                        <circle cx={area.center[0]} cy={area.center[1]} r={selected ? 5 : 3.5} className="area-center" />
                        <text x={area.center[0]} y={area.center[1] + 20} className="parcel-label">{area.type === "Study area" ? "SURVEY BLOCK" : area.name.replace("Synthetic ", "").toUpperCase()}</text>
                      </g>;
                    })}
                  </g>
                  <g className="north-arrow" aria-hidden="true"><text x="522" y="37">N</text><path d="M522 44 L518 55 L522 52 L526 55 Z" /></g>
                </svg>
                <div className="map-legend"><span><i className="legend-area" />Study area</span><span><i className="legend-parcel" />Synthetic parcel</span></div>
                <span className="scale-note">Schematic view · no verified boundaries</span>
              </div>
              <div className="map-footer"><span><i /> {SYNTHETIC_AREAS.length} synthetic areas available</span><span>Illustrative geometry only <b>ⓘ</b></span></div>
            </div>

            <aside className="selection-panel" aria-label="Area and analysis controls">
              <div className="panel-section area-section">
                <div className="section-kicker">01 <span>AREA SELECTION</span></div>
                <label className="field-label" htmlFor="area-select">Study area or parcel</label>
                <div className="select-wrap"><select id="area-select" value={selectedId} onChange={(event) => chooseArea(event.target.value)}>{SYNTHETIC_AREAS.map((area) => <option key={area.id} value={area.id}>{area.name} · {area.type}</option>)}</select><span aria-hidden="true">⌄</span></div>
                <div className="selected-area-summary"><div className="summary-icon">⌖</div><div><strong>{selectedArea.name}</strong><span>{selectedArea.type} <i>·</i> {selectedArea.area}</span></div><span className="selected-check">✓</span></div>
                <button className="clear-selection" onClick={() => { chooseArea(SYNTHETIC_AREAS[1].id); setZoom(1); setOffset({ x: 0, y: 0 }); }}>Reset map and selection</button>
              </div>

              <div className="panel-section date-section">
                <div className="section-kicker">02 <span>TIME WINDOW</span></div>
                <div className="date-fields"><div><label className="field-label" htmlFor="from-date">From</label><input id="from-date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setSelectionSaved(false); }} max={toDate} /></div><span className="date-arrow">→</span><div><label className="field-label" htmlFor="to-date">To</label><input id="to-date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setSelectionSaved(false); }} min={fromDate} /></div></div>
                {!dateRangeValid && <p className="date-error" role="alert">The end date must be on or after the start date.</p>}
                <p className="field-hint">Inclusive calendar dates</p>
              </div>

              <div className="panel-section analysis-section">
                <div className="section-kicker">03 <span>ANALYSIS</span></div>
                <label className="field-label" htmlFor="analysis-select">Select an observation type</label>
                <div className="select-wrap"><select id="analysis-select" value={analysis} onChange={(event) => { setAnalysis(event.target.value as typeof analysis); setSelectionSaved(false); }}>{ANALYSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><span aria-hidden="true">⌄</span></div>
                <div className="analysis-note"><span>i</span><p>Analysis results are not available yet. This workspace uses synthetic selections and schematic geometry.</p></div>
              </div>
              <button className="continue-button" disabled={!dateRangeValid} onClick={() => setSelectionSaved(true)}>{selectionSaved ? "Selection saved" : "Save selection"} <span aria-hidden="true">{selectionSaved ? "✓" : "→"}</span></button>
              <p className="continue-caption" aria-live="polite">{!dateRangeValid ? "Fix the date range to continue" : selectionSaved ? "Saved for this browser session · Observation results are not connected." : "Selection stays in this browser session only."}</p>
            </aside>
          </section>

          <footer className="page-footer"><span>Data status: no verified parcel boundaries or observations are connected.</span><span>Project workspace <b>·</b> v0.1</span></footer>
        </div>
      </section>
    </main>
  );
}
