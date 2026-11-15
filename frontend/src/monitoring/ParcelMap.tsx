import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParcelFeature } from "../api/types";

type LeafletMap = LeafletNS.Map;
type LayerGroup = LeafletNS.LayerGroup;

interface ParcelMapProps {
  parcels: ParcelFeature[];
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
  emptyMessage?: string;
}

export function ParcelMap({ parcels, selectedParcelId, onSelectParcel, emptyMessage }: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerGroupRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const leafletModule: any = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      const L = leafletModule.default ?? leafletModule;
      leafletRef.current = L;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([31.66, -7.70], 12);
      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri",
          maxZoom: 19,
        },
      );

      osm.addTo(map);
      L.control.layers({ "OpenStreetMap": osm, "Satellite imagery": satellite }).addTo(map);

      mapRef.current = map;
    }

    void init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }
    const layerGroup = layerGroupRef.current as LayerGroup;
    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasGeometry = false;

    parcels.forEach((parcel) => {
      if (!parcel.geometry) return;
      const parcelId = String(parcel.id ?? parcel.properties?.parcel_id ?? "");
      const isSelected = parcelId !== "" && parcelId === selectedParcelId;

      const layer = L.geoJSON(parcel.geometry as any, {
        style: {
          color: isSelected ? "#1f3b73" : "#728c66",
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? "#1f3b73" : "#728c66",
          fillOpacity: isSelected ? 0.28 : 0.16,
        },
      });

      layer.on("click", () => {
        if (parcelId) onSelectParcel(parcelId);
      });

      layer.bindTooltip(parcelId || "Parcel", { sticky: true });
      layer.addTo(layerGroup);

      const layerBounds = layer.getBounds();
      if (layerBounds.isValid()) {
        bounds.extend(layerBounds);
        hasGeometry = true;
      }
    });

    if (hasGeometry && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    }
  }, [parcels, selectedParcelId, onSelectParcel]);

  const hasGeometry = parcels.some((parcel) => Boolean(parcel.geometry));

  if (parcels.length === 0 || !hasGeometry) {
    return (
      <div className="map-empty-state" role="status">
        {emptyMessage ?? "No source-backed parcel geometries are available."}
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="parcel-leaflet-map" aria-label="Parcel map" />
      <div className="parcel-map-legend" aria-label="Parcel map legend">
        <span><i className="legend-available" /> Source-backed parcel geometry</span>
        <span><i className="legend-selected" /> Selected parcel</span>
      </div>
    </>
  );
}
