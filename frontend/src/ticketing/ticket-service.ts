import { MOCK_TICKETS } from "./mock-tickets";
import type { ObservationTicket } from "./ticket-types";

export const TICKETING_STORAGE_KEY = "dws_ticketing_tickets_v1";
export const MOCK_CURRENT_USER_ID = "mock-user-001";

function cloneTickets(tickets: readonly ObservationTicket[]): ObservationTicket[] {
  return tickets.map((ticket) => ({
    ...ticket,
    location: { ...ticket.location },
    attachments: ticket.attachments.map((attachment) => ({ ...attachment })),
  }));
}

/** Read the persistent demo store, seeding it with clearly synthetic records once. */
export function getTickets(): ObservationTicket[] {
  if (typeof window === "undefined") return cloneTickets(MOCK_TICKETS);

  try {
    const saved = window.localStorage.getItem(TICKETING_STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as ObservationTicket[];
    }
    const seed = cloneTickets(MOCK_TICKETS);
    window.localStorage.setItem(TICKETING_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch {
    return cloneTickets(MOCK_TICKETS);
  }
}

