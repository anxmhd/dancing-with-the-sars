import { useMemo, useState } from "react";
import type { Observation } from "./types";

export type ChartPoint = {
  observation: Observation;
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
  onSelect: (observation: Observation) => void;
  selectedAcquiredAt: string | null;
};

const WIDTH = 640;
const HEIGHT = 260;
const MARGIN = { top: 18, right: 18, bottom: 42, left: 58 };

function formatDate(date: Date): string {
  return date.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function ChartPanel({ title, subtitle, yLabel, series, onSelect, selectedAcquiredAt }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const allPoints = series.flatMap((item) => item.points);
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (allPoints.length === 0) {
      const now = Date.now();
      return { xMin: now, xMax: now + 1, yMin: 0, yMax: 1 };
    }
    const xs = allPoints.map((point) => point.date.getTime());
    const ys = allPoints.map((point) => point.value);
    const xMinValue = Math.min(...xs);
    const xMaxValue = Math.max(...xs);
    const yMinValue = Math.min(...ys);
    const yMaxValue = Math.max(...ys);
    const yPad = (yMaxValue - yMinValue) * 0.12 || Math.abs(yMaxValue) * 0.12 || 0.1;
    return {
      xMin: xMinValue,
      xMax: xMaxValue === xMinValue ? xMinValue + 1 : xMaxValue,
      yMin: yMinValue - yPad,
      yMax: yMaxValue + yPad,
    };
  }, [allPoints]);

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  function xScale(value: number): number {
    return MARGIN.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yScale(value: number): number {
    return MARGIN.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
  }

  const xTicks = useMemo(() => {
    const count = Math.min(6, allPoints.length || 1);
    if (allPoints.length === 0) return [];
    const step = (xMax - xMin) / (count - 1 || 1);
    return Array.from({ length: count }, (_, index) => xMin + step * index);
  }, [allPoints, xMin, xMax]);

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
        <span className="chart-axis-label">{yLabel}</span>
      </header>
      {allPoints.length === 0 ? (
        <div className="chart-empty">No accepted measurements in this window.</div>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img" aria-label={title}>
          {yTicks.map((tick, index) => (
            <g key={`y-${index}`}>
              <line x1={MARGIN.left} y1={yScale(tick)} x2={WIDTH - MARGIN.right} y2={yScale(tick)} className="chart-grid" />
              <text x={MARGIN.left - 8} y={yScale(tick) + 3} textAnchor="end" className="chart-tick">
                {tick < 0.01 ? tick.toPrecision(2) : tick.toFixed(3)}
              </text>
            </g>
          ))}
          {xTicks.map((tick, index) => (
            <text key={`x-${index}`} x={xScale(tick)} y={HEIGHT - 12} textAnchor="middle" className="chart-tick">
              {formatDate(new Date(tick))}
            </text>
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
                const isSelected = selectedAcquiredAt === point.observation.acquiredAt;
                const isHovered = hovered === `${item.id}-${index}`;
                return (
                  <circle
                    key={`${item.id}-${index}`}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : isHovered ? 5 : 4}
                    fill={item.color}
                    stroke={isSelected ? "#1d302c" : "#fff"}
                    strokeWidth={isSelected ? 2 : 1}
                    className="chart-point"
                    onClick={() => onSelect(point.observation)}
                    onMouseEnter={() => setHovered(`${item.id}-${index}`)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{`${item.label}: ${point.value.toPrecision(4)} on ${point.observation.observationDate}`}</title>
                  </circle>
                );
              })}
            </g>
          ))}
          <g className="chart-legend" transform={`translate(${MARGIN.left}, ${HEIGHT - 6})`}>
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
