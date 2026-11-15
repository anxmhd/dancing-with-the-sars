import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import availableFixture from "../../contracts/fixtures/sentinel1-sentinel2-available.json";
import emptyFixture from "../../contracts/fixtures/no-observations.json";
import nisarFixture from "../../contracts/fixtures/nisar-quality-excluded.json";
import partialFixture from "../../contracts/fixtures/partial-sensor-availability.json";
import unavailableFixture from "../../contracts/fixtures/unavailable-source.json";
import { fetchObservations } from "./api";
import { App, GuidedDemo, ResultsPanel } from "./App";
import { ChartPanel } from "./charts";
import { ndviSeries, sentinel1Series } from "./chartData";
import type { ObservationResponse } from "./types";

const asResponse = (value: unknown) => value as ObservationResponse;

afterEach(() => vi.unstubAllGlobals());

describe("parcel observatory", () => {
  it("renders the application identity and source-backed parcel workflow", () => {
    const markup = renderToStaticMarkup(<App />);
    expect(markup).toContain("Dancing with the SARs");
    expect(markup).toContain("Selected parcel");
    expect(markup).toContain("Update view");
  });

  it("loads the shared real-result fixture through the API client", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(availableFixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await fetchObservations("parcel / 1", "2026-10-01", "2026-11-30", ["Sentinel-2", "NISAR"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/v1/parcels/parcel%20%2F%201/observations?");
    expect(calledUrl).toContain("missions=Sentinel-2");
    expect(calledUrl).toContain("missions=NISAR");
  });

  it("keeps acquisition summaries compact until a chart point is selected", () => {
    const markup = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(availableFixture)} />,
    );
    expect(markup).toContain("Sentinel-2");
    expect(markup).toContain("Sentinel-1");
    expect(markup).toContain("Select a chart point to see its measurement and provenance.");
    expect(markup).not.toContain("measurement-card");
    expect(markup).not.toContain("0.368");
  });

  it("keeps NISAR excluded measurements null and presents the partial result state", () => {
    const markup = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(partialFixture)} />,
    );
    expect(markup).toContain("Some acquisitions are missing or quality-excluded.");
    expect(markup).toContain("NISAR");
    expect(markup).not.toContain("measurement-card");
  });

  it("distinguishes empty, unavailable, loading, and request error states", () => {
    const empty = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(emptyFixture)} />,
    );
    expect(empty).toContain("No local processed observations");
    expect(empty).toContain("not evidence that the satellites made no acquisitions");

    const unavailable = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(unavailableFixture)} />,
    );
    expect(unavailable).toContain("Source coverage unavailable");

    expect(renderToStaticMarkup(<ResultsPanel loading error={null} response={null} />)).toContain(
      "Loading local satellite observations",
    );
    expect(
      renderToStaticMarkup(<ResultsPanel loading={false} error="Backend unavailable" response={null} />),
    ).toContain("Backend unavailable");
  });

  it("keeps excluded NISAR channel details out of the chart summary", () => {
    const markup = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(nisarFixture)} />,
    );
    expect(markup).toContain("Acquisitions excluded by quality");
    expect(markup).toContain("0 accepted · 1 excluded · 1 acquisition");
    expect(markup).not.toContain("No valid value");
  });

  it("places accessible chart points on the requested calendar timeline", () => {
    const series = ndviSeries(asResponse(availableFixture).observations);
    const markup = renderToStaticMarkup(
      <ChartPanel
        title="Sentinel-2"
        subtitle="NDVI"
        yLabel="NDVI (1)"
        series={series}
        dateRange={{ startDate: "2026-08-14", endDate: "2026-11-06" }}
        onSelect={() => undefined}
        selectedPointKey={null}
      />,
    );
    expect(markup).toContain('role="button"');
    expect(markup).toContain("aria-label=\"Select NDVI,");
    expect(markup).toContain("Aug 14");
    expect(markup).toContain("Nov 6");
  });

  it("guides users through real points and states when a sensor point is unavailable", () => {
    const observations = asResponse(availableFixture).observations;
    const vegetationPoint = ndviSeries(observations)[0].points[0] ?? null;
    const radarPoint = sentinel1Series(observations).find((series) => series.id === "vv")?.points.at(-1) ?? null;
    const markup = renderToStaticMarkup(
      <GuidedDemo
        steps={[
          {
            id: "vegetation",
            title: "Vegetation timeline",
            measureLabel: "NDVI (unit 1)",
            explanation: "NDVI is a vegetation index; by itself, it does not diagnose crop stress.",
            point: vegetationPoint,
          },
          {
            id: "sentinel-1",
            title: "C-band radar context",
            measureLabel: "Sentinel-1 VV median",
            explanation: "Sentinel-1 backscatter is shown as linear power.",
            point: radarPoint,
          },
          {
            id: "nisar",
            title: "NISAR snapshot",
            measureLabel: "NISAR frequency A · HH",
            explanation: "One acquisition date cannot show a trend.",
            point: null,
          },
        ]}
        selectedPointKey={null}
        onSelect={() => undefined}
        disabled={false}
      />,
    );
    expect(markup).toContain("Vegetation timeline");
    expect(markup).toContain("NDVI (unit 1) · ");
    expect(markup).toContain("Sentinel-1 VV median · ");
    expect(markup).toContain("NDVI is a vegetation index");
    expect(markup).toContain("No accepted measurement for this step in the current selection.");
  });
});
