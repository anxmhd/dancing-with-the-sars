import type { ChartPoint, ChartSeries } from "./charts";
import type { Observation } from "./types";

export function ndviSeries(observations: Observation[]): ChartSeries[] {
  const points: ChartPoint[] = [];
  for (const observation of observations) {
    if (observation.mission !== "Sentinel-2") continue;
    const measurement = observation.measurements.find((item) => item.quantity === "NDVI");
    if (!measurement || measurement.value === null) continue;
    if (measurement.quality.status !== "accepted") continue;
    points.push({ observation, value: measurement.value, date: new Date(`${observation.observationDate}T00:00:00Z`) });
  }
  return [{ id: "ndvi", label: "NDVI", color: "#315b47", points }];
}

export function sentinel1Series(observations: Observation[]): ChartSeries[] {
  const vv: ChartPoint[] = [];
  const vh: ChartPoint[] = [];
  for (const observation of observations) {
    if (observation.mission !== "Sentinel-1") continue;
    for (const measurement of observation.measurements) {
      if (measurement.statistic !== "median") continue;
      if (measurement.quality.status !== "accepted" || measurement.value === null) continue;
      const point: ChartPoint = {
        observation,
        value: measurement.value,
        date: new Date(`${observation.observationDate}T00:00:00Z`),
      };
      if (measurement.polarization === "VV") vv.push(point);
      if (measurement.polarization === "VH") vh.push(point);
    }
  }
  return [
    { id: "vv", label: "VV (median)", color: "#c7713d", points: vv },
    { id: "vh", label: "VH (median)", color: "#8a5a3b", points: vh },
  ];
}

export function nisarSeries(observations: Observation[], frequency: "A" | "B"): ChartSeries[] {
  const hh: ChartPoint[] = [];
  const hv: ChartPoint[] = [];
  for (const observation of observations) {
    if (observation.mission !== "NISAR") continue;
    for (const measurement of observation.measurements) {
      if (measurement.frequency !== frequency) continue;
      if (measurement.quality.status !== "accepted" || measurement.value === null) continue;
      const point: ChartPoint = {
        observation,
        value: measurement.value,
        date: new Date(`${observation.observationDate}T00:00:00Z`),
      };
      if (measurement.polarization === "HH") hh.push(point);
      if (measurement.polarization === "HV") hv.push(point);
    }
  }
  return [
    { id: `nisar-${frequency}-hh`, label: `HH (freq ${frequency})`, color: "#53765e", points: hh },
    { id: `nisar-${frequency}-hv`, label: `HV (freq ${frequency})`, color: "#9b7a5a", points: hv },
  ];
}
