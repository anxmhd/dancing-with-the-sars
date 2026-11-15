import { useEffect, useRef, useState } from "react";
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { ParcelFeatureCollection } from "./types";

type Props = {
  parcels: ParcelFeatureCollection | null;
  selectedParcelId: string;
  onSelect: (parcelId: string) => void;
};

export function ParcelMap({ parcels, selectedParcelId, onSelect }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<any>(null);
  const layerRef = useRef<LeafletGeoJSON | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState<"osm" | "satellite">("osm");
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
      <div className="basemap-switch" role="group" aria-label="Basemap selection">
        <button type="button" className={basemap === "osm" ? "active" : ""} onClick={() => setBasemap("osm")}>Map</button>
        <button type="button" className={basemap === "satellite" ? "active" : ""} onClick={() => setBasemap("satellite")}>Satellite</button>
      </div>
      <div className="map-legend" aria-label="Parcel legend">
        <span className="legend-swatch" />
        <span>Source-backed parcel</span>
      </div>
      <div className="map-canvas" ref={elementRef} aria-label="Interactive map of available parcels" />
    </div>
  );
}
