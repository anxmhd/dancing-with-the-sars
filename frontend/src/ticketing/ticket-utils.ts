import type { ObservationTicket, TicketFilters } from "./ticket-types";

export function calculateRating(positiveVotes: number, negativeVotes: number): number {
  const rating = (100 * (positiveVotes + 5)) / (positiveVotes + negativeVotes + 10);
  return Math.round(rating * 10) / 10;
}

export function totalVotes(ticket: ObservationTicket): number {
  return ticket.positiveVotes + ticket.negativeVotes;
}

export function filterTickets(
  tickets: readonly ObservationTicket[],
  filters: TicketFilters,
  currentUserId: string,
): ObservationTicket[] {
  const query = filters.search.trim().toLowerCase();

  return tickets.filter((ticket) => {
    if (filters.view === "mine" && ticket.authorId !== currentUserId) return false;
    if (filters.category !== "all" && ticket.category !== filters.category) return false;
    if (filters.urgency !== "all" && ticket.urgency !== filters.urgency) return false;
    if (filters.status !== "all" && ticket.status !== filters.status) return false;
    if (filters.area && !ticket.location.areaName.toLowerCase().includes(filters.area.toLowerCase())) return false;
    if (!query) return true;

    return [ticket.title, ticket.description, ticket.location.areaName]
      .some((value) => value.toLowerCase().includes(query));
  });
}

export function sortTickets(
  tickets: readonly ObservationTicket[],
  sort: TicketFilters["sort"],
): ObservationTicket[] {
  return [...tickets].sort((a, b) => {
    const recent = b.createdAt.localeCompare(a.createdAt);
    const votesA = totalVotes(a);
    const votesB = totalVotes(b);
    const ratingA = calculateRating(a.positiveVotes, a.negativeVotes);
    const ratingB = calculateRating(b.positiveVotes, b.negativeVotes);

    switch (sort) {
      case "rating":
        return ratingB - ratingA || recent;
      case "controversial":
        return Math.abs(ratingA - 50) - Math.abs(ratingB - 50) || votesB - votesA || recent;
      case "votes":
        return votesB - votesA || recent;
      case "newest":
      default:
        return recent;
    }
  });
}

