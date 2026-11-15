import { useEffect, useRef, useState } from "react";
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap, TileLayer } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { ParcelFeatureCollection } from "./types";
import {
  DEFAULT_NISAR_DATE,
  NISAR_AVAILABLE_DATES,
  NISAR_GIBS_WMS_URL,
  nisarWmsOptions,
  type NisarDate,
} from "./maps/nisarGibs";

type Props = {
  parcels: ParcelFeatureCollection | null;
  selectedParcelId: string;
  onSelect: (parcelId: string) => void;
};

export function ParcelMap({ parcels, selectedParcelId, onSelect }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<any>(null);
  const nisarLayerRef = useRef<TileLayer.WMS | null>(null);
  const layerRef = useRef<LeafletGeoJSON | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState<"osm" | "satellite">("osm");
  const [nisarEnabled, setNisarEnabled] = useState(true);
  const [nisarDate, setNisarDate] = useState<NisarDate>(DEFAULT_NISAR_DATE);
  const [nisarOpacity, setNisarOpacity] = useState(0.82);
  const [nisarLayerError, setNisarLayerError] = useState(false);
  const selectedRef = useRef(selectedParcelId);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    selectedRef.current = selectedParcelId;
  }, [selectedParcelId]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    let resize: number | null = null;
    void import("leaflet").then(({ default: L }) => {
      if (!elementRef.current || cancelled) return;
      map = L.map(elementRef.current, { scrollWheelZoom: false }).setView(
        [31.6614, -7.7015],
        15,
      );
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      tileLayerRef.current = tileLayer;
      mapRef.current = map;
      setMapReady(true);
      resize = window.setTimeout(() => map?.invalidateSize(), 0);
    });
    return () => {
      cancelled = true;
      if (resize !== null) window.clearTimeout(resize);
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    let layer: any = null;
    void import("leaflet").then(({ default: L }) => {
      if (mapRef.current !== map) return;
      if (basemap === "satellite") {
        layer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri",
        }).addTo(map);
      } else {
        layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
      }
      tileLayerRef.current = layer;
    });
    return () => {
      layer?.remove();
    };
  }, [basemap, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !nisarEnabled) {
      setNisarLayerError(false);
      return;
    }

    let cancelled = false;
    let layer: TileLayer.WMS | null = null;
    const handleTileError = () => setNisarLayerError(true);
    const handleTileLoad = () => setNisarLayerError(false);

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || mapRef.current !== map) return;
      layer = L.tileLayer.wms(
        NISAR_GIBS_WMS_URL,
        nisarWmsOptions(nisarDate, nisarOpacity),
      );
      layer.on("tileerror", handleTileError);
      layer.on("tileload", handleTileLoad);
      layer.addTo(map);
      nisarLayerRef.current = layer;
    });

    return () => {
      cancelled = true;
      if (!layer) return;
      layer.off("tileerror", handleTileError);
      layer.off("tileload", handleTileLoad);
      layer.remove();
      if (nisarLayerRef.current === layer) nisarLayerRef.current = null;
    };
  }, [mapReady, nisarEnabled, nisarDate, nisarOpacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !parcels || !mapReady) return;
    layerRef.current?.remove();
    const geoJson: FeatureCollection<Geometry> = {
      type: "FeatureCollection",
      features: parcels.features as Feature<Geometry>[],
    };
    let layer: LeafletGeoJSON | null = null;
    let cancelled = false;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || mapRef.current !== map || !parcels) return;
      layer = L.geoJSON(geoJson, {
      style: (feature) => ({
        color: feature?.id === selectedRef.current ? "#eff8e8" : "#b5d99b",
        weight: 3,
        fillColor: "#80a96a",
        fillOpacity: feature?.id === selectedRef.current ? 0.35 : 0.18,
      }),
      onEachFeature: (feature, featureLayer) => {
        const parcelId = String(feature.properties?.parcel_id ?? feature.id ?? "");
        featureLayer.bindTooltip("El Haouz reference parcel", { sticky: true });
        featureLayer.on("click", () => onSelectRef.current(parcelId));
      },
      }).addTo(map);
      layerRef.current = layer;
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(1.2), { maxZoom: 16 });
    });
    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [parcels, mapReady]);

  useEffect(() => {
    layerRef.current?.setStyle((feature) => ({
      color: feature?.id === selectedParcelId ? "#eff8e8" : "#b5d99b",
      fillOpacity: feature?.id === selectedParcelId ? 0.35 : 0.18,
    }));
  }, [selectedParcelId]);

  return (
    <div className="map-wrapper">
      <div className="map-layer-controls">
        <div className="basemap-switch" role="group" aria-label="Basemap selection">
          <button type="button" className={basemap === "osm" ? "active" : ""} onClick={() => setBasemap("osm")}>Map</button>
          <button type="button" className={basemap === "satellite" ? "active" : ""} onClick={() => setBasemap("satellite")}>Satellite</button>
        </div>
        <label className="nisar-layer-toggle">
          <input type="checkbox" checked={nisarEnabled} onChange={(event) => setNisarEnabled(event.target.checked)} />
          <span>NISAR GCOV scan</span>
        </label>
        {nisarEnabled && (
          <>
            <label className="nisar-control-label">
              Date
              <select value={nisarDate} onChange={(event) => setNisarDate(event.target.value as NisarDate)}>
                {NISAR_AVAILABLE_DATES.map((date) => (
                  <option key={date} value={date}>{date === "2026-10-25" ? "25 Oct 2026" : "06 Nov 2026"}</option>
                ))}
              </select>
            </label>
            <label className="nisar-opacity-control">
              Image opacity
              <input type="range" min="0.2" max="1" step="0.05" value={nisarOpacity} onChange={(event) => setNisarOpacity(Number(event.target.value))} />
            </label>
          </>
        )}
        <p className="nisar-map-note">False-color regional mosaic; coverage is patchy and colors are contextual, not a parcel measurement.</p>
      </div>
      <div className="map-legend" aria-label="Map legend">
        <span className="legend-swatch" />
        <span>Parcel</span>
        {nisarEnabled && <><span className="nisar-legend-swatch" /><span>NISAR mosaic</span></>}
      </div>
      <div className="map-canvas" ref={elementRef} aria-label="Interactive map of available parcels" />
      {nisarLayerError && (
        <div className="map-layer-error" role="status">
          NASA GIBS imagery could not be loaded. Parcel boundaries remain available.
        </div>
      )}
    </div>
  );
}
