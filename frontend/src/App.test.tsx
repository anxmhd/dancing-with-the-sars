import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("project shell", () => {
  it("renders the project identity and current foundation status", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Dancing with the SARs");
    expect(markup).toContain("no analysis modules are available yet");
  });
});
