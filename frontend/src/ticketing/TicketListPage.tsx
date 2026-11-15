import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getTickets, MOCK_CURRENT_USER_ID } from "./ticket-service";
import { calculateRating, filterTickets, sortTickets } from "./ticket-utils";
import type { TicketCategory, TicketFilters, TicketStatus, TicketUrgency } from "./ticket-types";

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  "vegetation-anomaly": "Vegetation anomaly",
  "suspected-drought": "Suspected drought",
  flood: "Flood or inundation",
  wildfire: "Wildfire impact",
  "land-movement": "Land-surface movement",
  "agricultural-change": "Agricultural or environmental change",
  other: "Other",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "Pending review",
  accepted: "Accepted",
  rejected: "Rejected",
};

const URGENCY_LABELS: Record<TicketUrgency, string> = {
  low: "Low urgency",
  medium: "Medium urgency",
  high: "High urgency",
  critical: "Critical urgency",
};

function readEnum<T extends string>(value: string | null, valid: readonly T[], fallback: T | "all"): T | "all" {
  return value && valid.includes(value as T) ? value as T : fallback;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function TicketCard({ ticket, returnTo }: { ticket: ReturnType<typeof getTickets>[number]; returnTo: string }) {
  const rating = calculateRating(ticket.positiveVotes, ticket.negativeVotes);
  const votes = ticket.positiveVotes + ticket.negativeVotes;

  return (
    <Link
      className="card bg-base-100 border border-base-300 shadow-sm ticket-card"
      to={`/tickets/${encodeURIComponent(ticket.id)}`}
      state={{ returnTo }}
      aria-label={`Open observation ${ticket.title}`}
    >
      <div className="card-body ticket-card-body">
        <div className="ticket-card-topline">
          <span className="ticket-id">{ticket.id}</span>
          <span className={`badge badge-outline status-badge status-${ticket.status}`}>{STATUS_LABELS[ticket.status]}</span>
        </div>
        <h2 className="ticket-card-title">{ticket.title}</h2>
        <p className="ticket-card-description">{ticket.description}</p>
        <div className="ticket-badges">
          <span className="badge badge-outline category-badge">{CATEGORY_LABELS[ticket.category]}</span>
          <span className={`badge urgency-badge urgency-${ticket.urgency}`}>{URGENCY_LABELS[ticket.urgency]}</span>
        </div>
        <div className="ticket-meta-grid">
          <span><small>AREA</small><strong>{ticket.location.areaName}</strong></span>
          <span><small>OBSERVED</small><strong>{formatDate(ticket.observationDate)}</strong></span>
          <span><small>SUBMITTED</small><strong>{formatDate(ticket.createdAt)}</strong></span>
          <span><small>REPORTED BY</small><strong>{ticket.authorName}</strong></span>
        </div>
        <div className="ticket-rating-row">
          <span className="ticket-rating-value">{rating.toFixed(1)}<small>/100</small></span>
          <span className="ticket-rating-bar"><progress className="progress progress-primary" value={rating} max="100" aria-label={`Community rating ${rating.toFixed(1)} out of 100`} /></span>
          <span className="ticket-vote-counts"><b aria-label={`${ticket.positiveVotes} positive votes`}>+ {ticket.positiveVotes}</b><i aria-hidden="true">·</i><b aria-label={`${ticket.negativeVotes} negative votes`}>− {ticket.negativeVotes}</b></span>
        </div>
        <div className="ticket-card-hint"><span>Community perception · {votes} {votes === 1 ? "vote" : "votes"}</span><span>View details <b aria-hidden="true">→</b></span></div>
      </div>
    </Link>
  );
}

export function TicketListPage() {
  const tickets = useMemo(() => getTickets(), []);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("q") ?? "";
  const [searchDraft, setSearchDraft] = useState(urlSearch);

  useEffect(() => {
    setSearchDraft(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    if (searchDraft.trim() === urlSearch) return;
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchDraft.trim()) next.set("q", searchDraft.trim());
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchDraft, searchParams, setSearchParams, urlSearch]);

  const filters: TicketFilters = {
    view: searchParams.get("view") === "mine" ? "mine" : "explore",
    search: searchDraft,
    category: readEnum(searchParams.get("category"), Object.keys(CATEGORY_LABELS) as TicketCategory[], "all"),
    urgency: readEnum(searchParams.get("urgency"), ["low", "medium", "high", "critical"], "all"),
    status: readEnum(searchParams.get("status"), ["pending", "accepted", "rejected"], "all"),
    area: searchParams.get("area") ?? "",
    sort: readEnum(searchParams.get("sort"), ["newest", "rating", "controversial", "votes"], "newest") as TicketFilters["sort"],
  };
  const filtered = filterTickets(tickets, filters, MOCK_CURRENT_USER_ID);
  const visibleTickets = sortTickets(filtered, filters.sort);
  const areas = [...new Set(tickets.map((ticket) => ticket.location.areaName))].sort();
  const returnParams = new URLSearchParams(searchParams);
  if (searchDraft.trim()) returnParams.set("q", searchDraft.trim());
  else returnParams.delete("q");
  const returnQuery = returnParams.toString();
  const returnTo = `${location.pathname}${returnQuery ? `?${returnQuery}` : ""}`;

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (searchDraft.trim()) next.set("q", searchDraft.trim());
    else next.delete("q");
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    setSearchDraft("");
    const next = new URLSearchParams();
    if (filters.view === "mine") next.set("view", "mine");
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="observations-page">
      <div className="observations-heading">
        <div>
          <div className="ticket-eyebrow">COMMUNITY FIELD NOTES <span>·</span> 01</div>
          <h1>Environmental Observations</h1>
          <p>Share and explore community reports about environmental and agricultural changes.</p>
        </div>
        <div className="feed-header-actions"><span className="badge badge-outline synthetic-banner">Synthetic demo feed</span><Link className="btn btn-primary new-report-link" to="/tickets/new">+ Share a report</Link></div>
      </div>

      <div className="alert alert-info demo-notice" role="note">
        <span className="notice-icon" aria-hidden="true">i</span>
        <span>All sample reports, names, locations, dates, and community ratings on this page are fictional. They are not scientific findings.</span>
      </div>

      <div className="observations-toolbar">
        <div className="tabs tabs-bordered ticket-tabs" role="tablist" aria-label="Observation views">
          <button id="explore-tab" className={`tab ${filters.view === "explore" ? "tab-active" : ""}`} role="tab" aria-controls="observation-results" aria-selected={filters.view === "explore"} onClick={() => updateFilter("view", "explore")}>Explore observations <span className="tab-count">{tickets.length}</span></button>
          <button id="my-tab" className={`tab ${filters.view === "mine" ? "tab-active" : ""}`} role="tab" aria-controls="observation-results" aria-selected={filters.view === "mine"} onClick={() => updateFilter("view", "mine")}>My observations <span className="tab-count">{tickets.filter((ticket) => ticket.authorId === MOCK_CURRENT_USER_ID).length}</span></button>
        </div>
        <label className="input input-bordered search-control">
          <span aria-hidden="true" className="search-icon">⌕</span>
          <span className="visually-hidden">Search observations</span>
          <input type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search observations" />
          {searchDraft && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearchDraft("")}>×</button>}
        </label>
      </div>

      <div className="ticket-results-layout">
        <aside className="filters-panel card bg-base-100 border border-base-300" aria-label="Observation filters">
          <div className="filter-heading"><h2>Refine results</h2><button type="button" className="filter-reset" onClick={clearFilters}>Clear all</button></div>
          <label className="filter-field"><span>Category</span><select className="select select-bordered" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}><option value="all">All categories</option>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Urgency</span><select className="select select-bordered" value={filters.urgency} onChange={(event) => updateFilter("urgency", event.target.value)}><option value="all">Any urgency</option>{Object.entries(URGENCY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Status</span><select className="select select-bordered" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="all">Any status</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-field"><span>Geographical area</span><select className="select select-bordered" value={filters.area} onChange={(event) => updateFilter("area", event.target.value)}><option value="">All areas</option>{areas.map((area) => <option key={area} value={area}>{area}</option>)}</select></label>
        </aside>

        <div className="ticket-results" id="observation-results" role="tabpanel" aria-labelledby={filters.view === "mine" ? "my-tab" : "explore-tab"}>
          <div className="results-toolbar"><p><strong>{visibleTickets.length}</strong> {visibleTickets.length === 1 ? "observation" : "observations"}{filters.view === "mine" ? " from you" : " in the community"}</p><label>Sort by <select className="select select-bordered sort-select" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="newest">Newest</option><option value="rating">Highest rating</option><option value="controversial">Most controversial</option><option value="votes">Most votes</option></select></label></div>

          {visibleTickets.length > 0 ? (
            <div className="ticket-card-grid">{visibleTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} returnTo={returnTo} />)}</div>
          ) : (
            <div className="card bg-base-100 border border-base-300 empty-results"><div className="card-body"><span className="empty-mark" aria-hidden="true">⌕</span><h2>No observations match these filters</h2><p>Try another search or clear the selected filters to see more demonstration reports.</p><button className="btn btn-outline" type="button" onClick={clearFilters}>Clear filters</button></div></div>
          )}
        </div>
      </div>
      <p className="community-rating-note">Community ratings reflect user perception only. They do not represent scientific validation or a moderation decision.</p>
    </section>
  );
}

