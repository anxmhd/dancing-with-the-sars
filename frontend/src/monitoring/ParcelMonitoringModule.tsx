import { useEffect, useState } from "react";
import { fetchParcel } from "../api/parcels";
import { DEFAULT_PARCEL_ID } from "../api/config";
import { useParcelObservations } from "../api/useParcelObservations";
import type { ObservationQuery, ParcelFeature } from "../api/types";
import { ApiError } from "../api/errors";
import { ParcelMap } from "./ParcelMap";
import { ObservationQueryControls } from "./ObservationQueryControls";
import { ObservationResults } from "./ObservationResults";

export function ParcelMonitoringModule() {
  const [parcels, setParcels] = useState<ParcelFeature[]>([]);
  const [parcelLoading, setParcelLoading] = useState(true);
  const [parcelError, setParcelError] = useState<ApiError | null>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [appliedQuery, setAppliedQuery] = useState<ObservationQuery | null>(null);

  const observationState = useParcelObservations(selectedParcelId ?? "", appliedQuery);

  useEffect(() => {
    let cancelled = false;
    setParcelLoading(true);
    setParcelError(null);

    fetchParcel(DEFAULT_PARCEL_ID)
      .then((parcel) => {
        if (cancelled) return;
        setParcels([parcel]);
        const parcelId = String(parcel.id ?? parcel.properties?.parcel_id ?? DEFAULT_PARCEL_ID);
        setSelectedParcelId(parcelId);
        setParcelLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setParcelError(err instanceof ApiError ? err : new ApiError("internalError", "Unexpected error.", 0, null));
        setParcels([]);
        setParcelLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleApply(query: ObservationQuery) {
    if (!selectedParcelId) return;
    setAppliedQuery(query);
  }

  return (
    <section className="parcel-monitoring-module" aria-labelledby="parcel-monitoring-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SCIENTIFIC MONITORING · REAL DATA</div>
          <h2 id="parcel-monitoring-title">Parcel monitoring</h2>
          <p>Source-backed parcel geometry and multisensor observations from the backend.</p>
        </div>
      </div>

      {parcelLoading && <p className="field-hint">Loading parcel geometry…</p>}
      {parcelError && <p className="date-error" role="alert">{parcelError.message}</p>}

      <ParcelMap
        parcels={parcels}
        selectedParcelId={selectedParcelId}
        onSelectParcel={setSelectedParcelId}
        emptyMessage="No source-backed parcel geometry is available."
      />

      <ObservationQueryControls
        parcelId={selectedParcelId}
        loading={observationState.loading}
        onApply={handleApply}
      />

      <ObservationResults
        data={observationState.data}
        loading={observationState.loading}
        error={observationState.error}
      />
    </section>
  );
}
