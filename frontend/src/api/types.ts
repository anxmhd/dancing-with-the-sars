export type Mission = "Sentinel-2" | "Sentinel-1" | "NISAR";
export type SensorStatus = "available" | "noObservations" | "noValidObservations" | "unavailable";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string | null;
  };
}

export interface GeoJsonGeometry {
  type: string;
  coordinates: unknown;
}

export interface ParcelFeature {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: GeoJsonGeometry | null;
}

export interface SensorResult {
  mission: Mission;
  status: SensorStatus;
  observationCount: number;
}

export interface MeasurementQuality {
  status: string;
  [key: string]: unknown;
}

export interface Measurement {
  quantity: string;
  value: number | null;
  unit: string;
  representation: string;
  statistic?: string;
  quality?: MeasurementQuality;
  processing?: Record<string, unknown>;
  polarization?: string;
  frequency?: string;
  frequencyBand?: string;
  covarianceTerm?: string;
}

export interface Observation {
  acquiredAt: string;
  observationDate: string;
  mission: Mission;
  platform: string;
  instrument: string;
  sensorDetails: Record<string, unknown>;
  source: Record<string, unknown>;
  measurements: Measurement[];
  limitations: string[];
}

export interface MultisensorResponse {
  contractVersion: string;
  parcelId: string;
  query: {
    startDate: string;
    endDate: string;
    requestedMissions: Mission[];
  };
  sensorResults: SensorResult[];
  observations: Observation[];
}

export interface ObservationQuery {
  startDate: string;
  endDate: string;
  missions: Mission[];
}
