export type ParcelFeature = {
  type: "Feature";
  id: string | number;
  properties: {
    parcel_id: string;
    reference_source: string;
    source_record_crop_label?: string;
    source_record_irrigation_label?: string;
    attribution: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
};

export type ParcelFeatureCollection = {
  type: "FeatureCollection";
  features: ParcelFeature[];
};

export type Quality = {
  status: "accepted" | "excluded" | "unknown";
  flags: string[] | null;
  reasons: string[];
  validPixelCount: number | null;
  totalPixelCount: number | null;
  validPixelFraction: number | null;
  excludedPixelCount: number | null;
};

export type Measurement = {
  quantity: string;
  value: number | null;
  unit: string;
  unitStatus: string;
  statistic: "median" | "mean";
  representation: string;
  frequencyBand?: string;
  frequency?: string;
  polarization?: string;
  covarianceTerm?: string;
  grid: {
    crs: string;
    resolution: number[];
    resolutionUnit: string;
  };
  quality: Quality;
};

export type Observation = {
  acquiredAt: string;
  observationDate: string;
  mission: "Sentinel-1" | "Sentinel-2" | "NISAR";
  platform: string;
  instrument: string;
  sensorDetails: Record<string, unknown>;
  source: {
    dataset: string;
    catalogProvider: string | null;
    catalogItemId: string | null;
    sourceProductIdentifier: string | null;
    productVersion: string | null;
    processingVersion: string | null;
    productMetadata: Record<string, unknown> | null;
    sourceProcessingNote: string | null;
  };
  measurements: Measurement[];
  limitations: string[];
};

export type SensorResult = {
  mission: Observation["mission"];
  status: "available" | "noObservations" | "noValidObservations" | "unavailable";
  observationCount: number;
};

export type ObservationResponse = {
  contractVersion: "1.0";
  parcelId: string;
  query: {
    startDate: string;
    endDate: string;
    requestedMissions: Observation["mission"][];
  };
  sensorResults: SensorResult[];
  observations: Observation[];
};

export type ApiError = {
  error: {
    code: "invalidRequest" | "parcelNotFound" | "internalError";
    message: string;
    requestId: string | null;
  };
};
