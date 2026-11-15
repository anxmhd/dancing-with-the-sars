export type TicketStatus = "pending" | "accepted" | "rejected";

export type TicketUrgency = "low" | "medium" | "high" | "critical";

export type TicketCategory =
  | "vegetation-anomaly"
  | "suspected-drought"
  | "flood"
  | "wildfire"
  | "land-movement"
  | "agricultural-change"
  | "other";

export type VoteType = "positive" | "negative";

export interface TicketLocation {
  areaName: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface TicketAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

export interface TicketVote {
  ticketId: string;
  userId: string;
  vote: VoteType;
}

export interface PeerReview {
  id: string;
  reviewerName: string;
  createdAt: string;
  comment: string;
}

export interface ObservationTicket {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  category: TicketCategory;
  location: TicketLocation;
  observationDate: string;
  createdAt: string;
  urgency: TicketUrgency;
  status: TicketStatus;
  attachments: TicketAttachment[];
  positiveVotes: number;
  negativeVotes: number;
  reviewComment?: string;
  reviews?: PeerReview[];
}

export interface TicketFilters {
  view: "explore" | "mine";
  search: string;
  category: TicketCategory | "all";
  urgency: TicketUrgency | "all";
  status: TicketStatus | "all";
  area: string;
  sort: "newest" | "rating" | "controversial" | "votes";
}

