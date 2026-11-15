
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./NisarRegionalMap.css";

const WMS_URL =
  "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";

const NISAR_LAYER =
  "NISAR_L2_Geocoded_Polarimetric_Covariance";

// Only include dates that you have verified are useful for your area.
const AVAILABLE_DATES = ["2026-11-06"];

export default function NisarRegionalMap() {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const nisarLayer = useRef<L.TileLayer.WMS | null>(null);

  const [selectedDate, setSelectedDate] = useState(
    AVAILABLE_DATES[0]
  );
  const [layerError, setLayerError] = useState(false);

  // Initialize the map once.
  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return;

    const map = L.map(mapElement.current, {
      center: [31.5, -7.8],
      zoom: 8,
      minZoom: 5,
      maxZoom: 15,
      zoomControl: true,
    });

    // OpenStreetMap base map.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // NASA NISAR GCOV visualization.
    const layer = L.tileLayer.wms(WMS_URL, {
      layers: NISAR_LAYER,
      format: "image/png",
      transparent: true,
      version: "1.1.1",
      time: selectedDate,
      attribution:
        'NASA NISAR / <a href="https://earthdata.nasa.gov/">NASA GIBS</a>',
    });

    layer.on("tileerror", () => setLayerError(true));
    layer.on("tileload", () => setLayerError(false));

    layer.addTo(map);

    mapInstance.current = map;
    nisarLayer.current = layer;

    // Ensure the map fits correctly if its container changes size.
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();

      mapInstance.current = null;
      nisarLayer.current = null;
    };
    // The map is initialized only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Change the NASA imagery date without recreating the map.
  useEffect(() => {
    nisarLayer.current?.setParams({
      time: selectedDate,
    });

    setLayerError(false);
  }, [selectedDate]);

  return (
    <section className="nisar-explorer">
      <div className="nisar-explorer__toolbar">
        <div>
          <h2>NISAR Regional Explorer</h2>
          <p>
            NASA NISAR GCOV false-colour backscatter visualization
          </p>
        </div>

        <label>
          Observation date
          <select
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          >
            {AVAILABLE_DATES.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        ref={mapElement}
        className="nisar-explorer__map"
        aria-label="Interactive map displaying NASA NISAR imagery over the Haouz region"
      />

      {layerError && (
        <p className="nisar-explorer__message">
          Some NISAR map tiles could not be loaded. Check your
          connection or try again later. This does not necessarily
          mean that NISAR has no observations for this date.
        </p>
      )}

      <p className="nisar-explorer__disclaimer">
        This is a NASA GIBS visualization, not a quantitative
        measurement or a crop-health assessment. Image availability
        and coverage may vary across the map.
      </p>
    </section>
  );
}
