import { describe, expect, it } from "vitest";
import { MOCK_TICKETS } from "./mock-tickets";
import { calculateRating, filterTickets, sortTickets } from "./ticket-utils";
import type { TicketFilters } from "./ticket-types";

const defaults: TicketFilters = {
  view: "explore",
  search: "",
  category: "all",
  urgency: "all",
  status: "all",
  area: "",
  sort: "newest",
};

describe("community rating", () => {
  it.each([
    [0, 0, 50.0],
    [10, 0, 75.0],
    [0, 10, 25.0],
    [10, 10, 50.0],
    [20, 5, 71.4],
  ])("scores %i positive and %i negative votes as %s", (positive, negative, expected) => {
    expect(calculateRating(positive, negative)).toBe(expected);
  });
});

describe("ticket discovery", () => {
  it("filters by current user, category, and text across descriptions and areas", () => {
    const filtered = filterTickets(MOCK_TICKETS, {
      ...defaults,
      view: "mine",
      category: "vegetation-anomaly",
      search: "synthetic sector a",
    }, "mock-user-001");

    expect(filtered.map((ticket) => ticket.id)).toEqual(["OBS-2025-0142"]);
  });

  it("sorts by highest community score and then newest", () => {
    const sorted = sortTickets(MOCK_TICKETS, "rating");

    expect(sorted[0].id).toBe("OBS-2025-0138");
    expect(sorted.at(-1)?.id).toBe("OBS-2025-0107");
  });

  it("sorts controversial entries toward a balanced community score", () => {
    const sorted = sortTickets(MOCK_TICKETS, "controversial");

    expect(sorted[0].id).toBe("OBS-2025-0091");
  });
});

