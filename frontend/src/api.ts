import type { ApiError, ObservationResponse, ParcelFeatureCollection } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = payload as ApiError;
    throw new Error(error.error?.message ?? `Request failed (${response.status}).`);
  }
  return payload as T;
}

export function fetchParcels(signal?: AbortSignal): Promise<ParcelFeatureCollection> {
  return requestJson<ParcelFeatureCollection>("/api/v1/parcels", signal);
}

export function fetchObservations(
  parcelId: string,
  startDate: string,
  endDate: string,
  missions: string[],
  signal?: AbortSignal,
): Promise<ObservationResponse> {
  const params = new URLSearchParams({ startDate, endDate });
  for (const mission of missions) params.append("missions", mission);
  return requestJson<ObservationResponse>(
    `/api/v1/parcels/${encodeURIComponent(parcelId)}/observations?${params.toString()}`,
    signal,
  );
}
