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

export interface ParcelCollection {
  type: "FeatureCollection";
  features: ParcelFeature[];
}

export interface SensorResult {
  mission: Mission;
  status: SensorStatus;
  observationCount: number;
}

export interface MeasurementQuality {
  status: string;
  flags?: string[];
  reasons?: string[];
  validPixelCount?: number;
  totalPixelCount?: number;
  validPixelFraction?: number;
  excludedPixelCount?: number;
  [key: string]: unknown;
}

export interface MeasurementGrid {
  crs?: string;
  resolution?: number[];
  resolutionUnit?: string;
  transformGdal?: number[];
  [key: string]: unknown;
}

export interface Measurement {
  quantity: string;
  value: number | null;
  unit: string;
  representation: string;
  statistic?: string;
  unitStatus?: string;
  quality?: MeasurementQuality;
  processing?: Record<string, unknown>;
  polarization?: string;
  frequency?: string;
  frequencyBand?: string;
  covarianceTerm?: string;
  frequencyHz?: number;
  grid?: MeasurementGrid;
}

export interface ObservationSource {
  catalogProvider?: string | null;
  dataset?: string;
  collectionId?: string;
  catalogItemId?: string | null;
  catalogUrl?: string | null;
  sourceProductIdentifier?: string | null;
  productUri?: string | null;
  processingVersion?: string | null;
  processingDateTime?: string | null;
  productType?: string | null;
  processingLevel?: string | null;
  assetSource?: string | null;
  sourceProcessingNote?: string | null;
  productMetadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface Observation {
  acquiredAt: string;
  observationDate: string;
  mission: Mission;
  platform: string;
  instrument: string;
  sensorDetails: Record<string, unknown>;
  source: ObservationSource;
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
