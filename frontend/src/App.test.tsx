import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { MOCK_USERS } from "./mock/mock-users";

function renderApp(path: string, accountIndex: number | null = null) {
  const user = accountIndex === null ? null : MOCK_USERS[accountIndex].user;
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider initialUser={user}><App /></AuthProvider>
    </MemoryRouter>,
  );
}

describe("study area explorer", () => {
  it("renders the researcher study area workflow", () => {
    const markup = renderApp("/researcher/dashboard", 2);

    expect(markup).toContain("Dancing with the SARs");
    expect(markup).toContain("Study area explorer");
    expect(markup).toContain("Synthetic parcel 01");
    expect(markup).toContain("Inclusive calendar dates");
    expect(markup).toContain("Schematic view");
  });
});

describe("community observations route", () => {
  it("renders the synthetic community feed at /tickets", () => {
    const markup = renderApp("/tickets", 0);

    expect(markup).toContain("Environmental Observations");
    expect(markup).toContain("Explore observations");
    expect(markup).toContain("My observations");
    expect(markup).toContain("All sample reports");
  });
});

describe("agricultural advisor route", () => {
  it("renders the regional overview for the synthetic advisor demo user", () => {
    const markup = renderApp("/advisor/dashboard", 0);

    expect(markup).toContain("Regional overview");
    expect(markup).toContain("Amina El Fassi");
    expect(markup).toContain("No scientifically validated observations available");
    expect(markup).toContain("not scientific validation");
    expect(markup).toContain("No verified historical time series available");
  });
});

describe("authentication routes", () => {
  it("shows role selection and mock sign-in form to signed-out users", () => {
    const markup = renderApp("/login");

    expect(markup).toContain("Sign in to your workspace");
    expect(markup).toContain("Agricultural Advisor");
    expect(markup).toContain("Researcher");
    expect(markup).toContain("Show synthetic demo accounts");
  });
});
