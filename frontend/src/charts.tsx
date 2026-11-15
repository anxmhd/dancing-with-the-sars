import { useMemo, useState } from "react";
import type { Observation } from "./types";

export type ChartPoint = {
  key: string;
  observation: Observation;
  measurement: Observation["measurements"][number];
  value: number;
  date: Date;
};

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
};

type Props = {
  title: string;
  subtitle: string;
  yLabel: string;
  series: ChartSeries[];
  dateRange: { startDate: string; endDate: string };
  onSelect: (point: ChartPoint) => void;
  selectedPointKey: string | null;
};

const WIDTH = 640;
const HEIGHT = 280;
const MARGIN = { top: 18, right: 18, bottom: 58, left: 58 };

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function monthTicks(startDate: string, endDate: string): number[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  if (end === start) return [start];

  const ticks = [start];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  while (cursor.getTime() < end) {
    ticks.push(cursor.getTime());
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  ticks.push(end);
  return ticks;
}

function formatTick(timestamp: number, index: number, count: number): string {
  const date = new Date(timestamp);
  const month = date.toLocaleDateString("en", { month: "short", timeZone: "UTC" });
  if (index === 0 || index === count - 1) {
    const day = date.toLocaleDateString("en", { day: "numeric", timeZone: "UTC" });
    return `${month} ${day}`;
  }
  return month;
}

export function ChartPanel({ title, subtitle, yLabel, series, dateRange, onSelect, selectedPointKey }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const allPoints = series.flatMap((item) => item.points);
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const ys = allPoints.map((point) => point.value);
    const requestedStart = parseDate(dateRange.startDate);
    const requestedEnd = parseDate(dateRange.endDate) + 24 * 60 * 60 * 1000;
    const pointStart = allPoints.length ? Math.min(...allPoints.map((point) => point.date.getTime())) : 0;
    const pointEnd = allPoints.length ? Math.max(...allPoints.map((point) => point.date.getTime())) + 1 : 1;
    const xMinValue = Number.isFinite(requestedStart) ? requestedStart : pointStart;
    const xMaxValue = Number.isFinite(requestedEnd) && requestedEnd > xMinValue ? requestedEnd : pointEnd;
    const yMinValue = ys.length ? Math.min(...ys) : 0;
    const yMaxValue = ys.length ? Math.max(...ys) : 1;
    const yPad = (yMaxValue - yMinValue) * 0.12 || Math.abs(yMaxValue) * 0.12 || 0.01;
    return {
      xMin: xMinValue,
      xMax: xMaxValue,
      yMin: yMinValue - yPad,
      yMax: yMaxValue + yPad,
    };
  }, [allPoints, dateRange.startDate, dateRange.endDate]);

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  function xScale(value: number): number {
    return MARGIN.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yScale(value: number): number {
    return MARGIN.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  }

  const xTicks = useMemo(
    () => monthTicks(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate, dateRange.endDate],
  );

  const yTicks = useMemo(() => {
    const count = 5;
    const step = (yMax - yMin) / (count - 1);
    return Array.from({ length: count }, (_, index) => yMin + step * index);
  }, [yMin, yMax]);

  return (
    <section className="chart-panel">
      <header className="chart-header">
        <div>
          <p className="eyebrow">{title}</p>
          <h3>{subtitle}</h3>
        </div>
        <span className="chart-axis-label">{allPoints.length} point{allPoints.length === 1 ? "" : "s"}</span>
      </header>
      {allPoints.length === 0 ? (
        <div className="chart-empty">No accepted measurements in this window.</div>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="group" aria-label={`${title} chart`}>
          {yTicks.map((tick, index) => (
            <g key={`y-${index}`}>
              <line x1={MARGIN.left} y1={yScale(tick)} x2={WIDTH - MARGIN.right} y2={yScale(tick)} className="chart-grid" />
              <text x={MARGIN.left - 8} y={yScale(tick) + 3} textAnchor="end" className="chart-tick">
                {tick < 0.01 ? tick.toPrecision(2) : tick.toFixed(3)}
              </text>
            </g>
          ))}
          {xTicks.map((tick, index) => (
            <g key={`x-${index}`}>
              <line x1={xScale(tick)} y1={HEIGHT - MARGIN.bottom} x2={xScale(tick)} y2={HEIGHT - MARGIN.bottom + 4} className="chart-axis" />
              <text x={xScale(tick)} y={HEIGHT - 29} textAnchor={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle"} className="chart-tick">
                {formatTick(tick, index, xTicks.length)}
              </text>
            </g>
          ))}
          <line x1={MARGIN.left} y1={HEIGHT - MARGIN.bottom} x2={WIDTH - MARGIN.right} y2={HEIGHT - MARGIN.bottom} className="chart-axis" />
          <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={HEIGHT - MARGIN.bottom} className="chart-axis" />
          <text x={MARGIN.left - 44} y={MARGIN.top + plotHeight / 2} transform={`rotate(-90 ${MARGIN.left - 44} ${MARGIN.top + plotHeight / 2})`} className="chart-axis-title">
            {yLabel}
          </text>
          {series.map((item) => (
            <g key={item.id}>
              {item.points.map((point, index) => {
                const cx = xScale(point.date.getTime());
                const cy = yScale(point.value);
                const isSelected = selectedPointKey === point.key;
                const pointId = `${item.id}-${index}`;
                const isHovered = hovered === pointId;
                return (
                  <circle
                    key={point.key}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : isHovered ? 5 : 4.5}
                    fill={item.color}
                    stroke={isSelected ? "#1d302c" : "#fff"}
                    strokeWidth={isSelected ? 2 : 1}
                    className={isSelected ? "chart-point selected" : "chart-point"}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${item.label}, ${point.value.toPrecision(4)} on ${point.observation.observationDate}`}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(point)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(point);
                      }
                    }}
                    onMouseEnter={() => setHovered(pointId)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`${item.label}: ${point.value.toPrecision(4)} on ${point.observation.observationDate}. Select for details.`}</title>
                  </circle>
                );
              })}
            </g>
          ))}
          <g className="chart-legend" transform={`translate(${MARGIN.left}, ${HEIGHT - 3})`}>
            {series.map((item, index) => (
              <g key={item.id} transform={`translate(${index * 150}, 0)`}>
                <circle cx={4} cy={-4} r={4} fill={item.color} />
                <text x={12} y={0} className="chart-legend-text">{item.label}</text>
              </g>
            ))}
          </g>
        </svg>
      )}
    </section>
  );
}
