import type { WMSOptions } from "leaflet";

export const NISAR_GIBS_WMS_URL =
  "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
export const NISAR_GIBS_LAYER =
  "NISAR_L2_Geocoded_Polarimetric_Covariance";

// Checked against the GIBS image service at the campaign parcel locations.
export const NISAR_AVAILABLE_DATES = ["2026-10-25", "2026-11-06"] as const;
export type NisarDate = (typeof NISAR_AVAILABLE_DATES)[number];
export const DEFAULT_NISAR_DATE: NisarDate = "2026-11-06";

// NASA GIBS supports the WMS TIME parameter, which Leaflet's types omit.
export type DatedWmsOptions = WMSOptions & { time: string; uppercase: true };

export function nisarWmsOptions(date: NisarDate, opacity = 0.82): DatedWmsOptions {
  return {
    layers: NISAR_GIBS_LAYER,
    format: "image/png",
    transparent: true,
    version: "1.1.1",
    uppercase: true,
    time: date,
    opacity,
    attribution:
      'NASA NISAR / <a href="https://earthdata.nasa.gov/">NASA GIBS</a>',
  };
}
