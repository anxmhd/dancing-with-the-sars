import { useEffect, useState } from "react";
import { fetchParcelObservations } from "./parcels";
import type { MultisensorResponse, ObservationQuery } from "./types";
import { ApiError } from "./errors";

export interface ObservationState {
  data: MultisensorResponse | null;
  loading: boolean;
  error: ApiError | null;
}

export function useParcelObservations(
  parcelId: string,
  query: ObservationQuery | null,
): ObservationState {
  const [data, setData] = useState<MultisensorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const startDate = query?.startDate ?? "";
  const endDate = query?.endDate ?? "";
  const missionsKey = query?.missions.join(",") ?? "";

  useEffect(() => {
    if (!parcelId || !query) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchParcelObservations(
      parcelId,
      {
        startDate,
        endDate,
        missions: missionsKey.split(",") as ObservationQuery["missions"],
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err : new ApiError("internalError", "Unexpected error.", 0, null));
        setLoading(false);
      });

    return () => controller.abort();
  }, [parcelId, startDate, endDate, missionsKey, query]);

  return { data, loading, error };
}
