import { describe, expect, it } from "vitest";
import { dashboardPathForRole, roleForAccountType } from "./roles";

describe("account role routing", () => {
  it("maps regular accounts to the agricultural advisor dashboard", () => {
    expect(roleForAccountType("regular")).toBe("advisor");
    expect(dashboardPathForRole("advisor")).toBe("/advisor/dashboard");
  });

  it("maps scientific accounts to the researcher dashboard", () => {
    expect(roleForAccountType("scientific")).toBe("researcher");
    expect(dashboardPathForRole("researcher")).toBe("/researcher/dashboard");
  });
});
