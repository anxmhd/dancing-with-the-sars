import { apiRequest } from "./client";
import type { Mission, MultisensorResponse, ObservationQuery, ParcelFeature } from "./types";

export function fetchParcel(parcelId: string): Promise<ParcelFeature> {
  return apiRequest<ParcelFeature>(`/v1/parcels/${encodeURIComponent(parcelId)}`);
}

export function fetchParcelObservations(
  parcelId: string,
  query: ObservationQuery,
  signal?: AbortSignal,
): Promise<MultisensorResponse> {
  const params = new URLSearchParams();
  params.set("startDate", query.startDate);
  params.set("endDate", query.endDate);
  for (const mission of query.missions) {
    params.append("missions", mission);
  }
  return apiRequest<MultisensorResponse>(
    `/v1/parcels/${encodeURIComponent(parcelId)}/observations?${params.toString()}`,
    signal ? { signal } : undefined,
  );
}

export const ALL_MISSIONS: Mission[] = ["Sentinel-2", "Sentinel-1", "NISAR"];
