import { MOCK_TICKETS } from "./mock-tickets";
import type { ObservationTicket, PeerReview, TicketCategory, TicketUrgency } from "./ticket-types";

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

function storeTickets(tickets: ObservationTicket[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TICKETING_STORAGE_KEY, JSON.stringify(tickets));
}

export function createTicket(input: {
  title: string;
  description: string;
  category: TicketCategory;
  areaName: string;
  observationDate: string;
  urgency: TicketUrgency;
}): ObservationTicket {
  const tickets = getTickets();
  const now = new Date();
  const ticket: ObservationTicket = {
    id: `OBS-DEMO-${now.getTime()}`,
    authorId: MOCK_CURRENT_USER_ID,
    authorName: "Community researcher",
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    location: { areaName: input.areaName.trim() },
    observationDate: input.observationDate,
    createdAt: now.toISOString(),
    urgency: input.urgency,
    status: "pending",
    attachments: [],
    positiveVotes: 0,
    negativeVotes: 0,
    reviews: [],
  };
  storeTickets([ticket, ...tickets]);
  return ticket;
}

export function addPeerReview(ticketId: string, comment: string): PeerReview | null {
  const tickets = getTickets();
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) return null;
  const review: PeerReview = {
    id: `REVIEW-DEMO-${Date.now()}`,
    reviewerName: "Community researcher",
    createdAt: new Date().toISOString(),
    comment: comment.trim(),
  };
  ticket.reviews = [...(ticket.reviews ?? []), review];
  storeTickets(tickets);
  return review;
}

