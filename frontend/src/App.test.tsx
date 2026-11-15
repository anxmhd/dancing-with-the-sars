import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import availableFixture from "../../contracts/fixtures/sentinel1-sentinel2-available.json";
import emptyFixture from "../../contracts/fixtures/no-observations.json";
import nisarFixture from "../../contracts/fixtures/nisar-quality-excluded.json";
import partialFixture from "../../contracts/fixtures/partial-sensor-availability.json";
import unavailableFixture from "../../contracts/fixtures/unavailable-source.json";
import { fetchObservations } from "./api";
import { App, ResultsPanel } from "./App";
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

  it("shows actual available values and their sensor identities separately", () => {
    const markup = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(availableFixture)} />,
    );
    expect(markup).toContain("Sentinel-2");
    expect(markup).toContain("Sentinel-1");
    expect(markup).toContain("0.368");
    expect(markup).toContain("Linear gamma-zero power (not dB)");
  });

  it("keeps NISAR excluded measurements null and presents the partial result state", () => {
    const markup = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(partialFixture)} />,
    );
    expect(markup).toContain("Partial multisensor result");
    expect(markup).toContain("no accepted parcel-level value");
    expect(markup).toContain("0 / 6 valid pixels");
    expect(markup).toContain("A · HH");
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

  it("renders the NISAR-only excluded-acquisition fixture with all four channels", () => {
    const markup = renderToStaticMarkup(
      <ResultsPanel loading={false} error={null} response={asResponse(nisarFixture)} />,
    );
    expect(markup.match(/No valid value/g)).toHaveLength(4);
    expect(markup).toContain("Acquisitions found, but quality rules excluded all parcel measurements");
  });
});
