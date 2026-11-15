import type { Observation, ObservationResponse } from "./types";

export type InterpretationItem = { text: string; refs?: string[] };

export type InterpretationResult = {
  directObservations: string[];
  contextual: InterpretationItem[];
  limitations: string[];
};

type Point = { date: string; value: number };

function acceptedPoints(
  response: ObservationResponse,
  mission: Observation["mission"],
  pick: (measurement: Observation["measurements"][number]) => boolean,
): Point[] {
  const points: Point[] = [];
  for (const observation of response.observations) {
    if (observation.mission !== mission) continue;
    for (const measurement of observation.measurements) {
      if (!pick(measurement)) continue;
      if (measurement.quality.status !== "accepted" || measurement.value === null) continue;
      points.push({ date: observation.observationDate, value: measurement.value });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function formatValue(value: number): string {
  return value < 0.01 ? value.toPrecision(3) : value.toFixed(3);
}

function trendStatement(label: string, points: Point[]): string | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const difference = last.value - first.value;
  const relative = first.value !== 0 ? (difference / first.value) * 100 : null;
  const relativeText = relative === null ? "" : ` (${relative >= 0 ? "+" : ""}${relative.toFixed(1)}%)`;
  return `${label} changed from ${formatValue(first.value)} on ${first.date} to ${formatValue(last.value)} on ${last.date}; difference ${difference >= 0 ? "+" : ""}${formatValue(difference)}${relativeText}.`;
}

export function interpretCampaign(response: ObservationResponse): InterpretationResult {
  const direct: string[] = [];
  const contextual: InterpretationItem[] = [];
  const limitations: string[] = [];

  const parcelId = response.parcelId;

  for (const result of response.sensorResults) {
    if (result.status === "available") {
      direct.push(`${result.mission}: ${result.observationCount} acquisition${result.observationCount === 1 ? "" : "s"} in the selected window have at least one accepted measurement.`);
    } else if (result.status === "noObservations") {
      direct.push(`${result.mission}: no candidate acquisitions were found in the selected window. This does not establish that no satellite acquisition occurred.`);
    } else if (result.status === "noValidObservations") {
      direct.push(`${result.mission}: acquisitions were found, but quality rules excluded all parcel measurements.`);
    } else {
      direct.push(`${result.mission}: no processed artifacts are available locally for this parcel and window.`);
    }
  }

  const excludedObservations = response.observations.filter((observation) =>
    observation.measurements.some((measurement) => measurement.quality.status === "excluded"),
  );
  if (excludedObservations.length > 0) {
    direct.push(
      `${excludedObservations.length} acquisition${excludedObservations.length === 1 ? "" : "s"} had quality-excluded measurements: ${excludedObservations
        .map((item) => item.observationDate)
        .join(", ")}.`,
    );
  }

  const ndviPoints = acceptedPoints(response, "Sentinel-2", (measurement) => measurement.quantity === "NDVI");
  const ndviTrend = trendStatement("NDVI", ndviPoints);
  if (ndviTrend) direct.push(ndviTrend);

  const vvPoints = acceptedPoints(response, "Sentinel-1", (measurement) => measurement.polarization === "VV");
  const vhPoints = acceptedPoints(response, "Sentinel-1", (measurement) => measurement.polarization === "VH");
  const vvTrend = trendStatement("VV backscatter", vvPoints);
  const vhTrend = trendStatement("VH backscatter", vhPoints);
  if (vvTrend) direct.push(vvTrend);
  if (vhTrend) direct.push(vhTrend);

  const nisarAccepted = response.observations.filter(
    (observation) =>
      observation.mission === "NISAR" &&
      observation.measurements.some((measurement) => measurement.quality.status === "accepted" && measurement.value !== null),
  );
  if (nisarAccepted.length > 0) {
    direct.push(
      `NISAR has ${nisarAccepted.length} accepted acquisition${nisarAccepted.length === 1 ? "" : "s"} (${nisarAccepted
        .map((item) => item.observationDate)
        .join(", ")}). A single acquisition cannot establish a temporal trend.`,
    );
  }

  const partialCoverage = response.observations.flatMap((observation) =>
    observation.measurements.filter(
      (measurement) =>
        measurement.quality.validPixelFraction !== null && measurement.quality.validPixelFraction < 1,
    ),
  );
  if (partialCoverage.length > 0) {
    direct.push(`${partialCoverage.length} measurement${partialCoverage.length === 1 ? "" : "s"} had a valid-pixel fraction below 1.0.`);
  }

  contextual.push({
    text: "NDVI is an indirect vegetation index. Changes can reflect vegetation greenness and development, but do not independently establish vegetation stress, water stress, irrigation, drought impact, crop health, or groundwater conditions.",
    refs: ["N3", "N13"],
  });
  contextual.push({
    text: "C-band and L-band radar respond differently to vegetation and surface conditions because of wavelength, polarization, geometry, and processing. They are complementary, not interchangeable.",
    refs: ["N7", "N2"],
  });
  contextual.push({
    text: "VV and VH can provide complementary information about surface and vegetation scattering. Their relationships with soil moisture or roughness are site- and condition-dependent.",
    refs: ["N5"],
  });
  contextual.push({
    text: "Water-management estimation requires substantially more than radar backscatter or NDVI alone, including validated models and field measurements.",
    refs: ["N4", "N6"],
  });
  contextual.push({
    text: "No additional optical index (such as NDMI/NDWI) is implemented; the campaign retains NDVI only.",
    refs: ["N9", "N10"],
  });

  limitations.push("A change in NDVI does not independently establish water stress, drought impact, irrigation, crop health, or groundwater conditions.");
  limitations.push("A backscatter change does not independently establish a change in soil moisture or vegetation stress.");
  limitations.push("A single NISAR acquisition cannot establish a temporal trend.");
  limitations.push("Historical crop and irrigation labels are reference metadata, not verified current conditions.");
  limitations.push("The current dataset does not independently establish irrigation timing or amount.");
  limitations.push("Sentinel-2 SCL masking, statistic, and coverage thresholds are provisional demo choices.");
  limitations.push("Sentinel-1 source metadata omits unit, scale, and offset; values are stored linear gamma-zero power.");
  if (parcelId) {
    limitations.push(`Observations are restricted to parcel ${parcelId}; series from different parcels are not combined.`);
  }

  return { directObservations: direct, contextual, limitations };
}

export const interpret = interpretCampaign;
export const interpretObservations = interpretCampaign;
