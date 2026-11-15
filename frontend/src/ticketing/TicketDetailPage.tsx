import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { addPeerReview, getTickets } from "./ticket-service";
import { calculateRating } from "./ticket-utils";
import type { PeerReview, TicketCategory, TicketStatus, TicketUrgency } from "./ticket-types";

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  "vegetation-anomaly": "Vegetation anomaly",
  "suspected-drought": "Suspected drought",
  flood: "Flood or inundation",
  wildfire: "Wildfire impact",
  "land-movement": "Land-surface movement",
  "agricultural-change": "Agricultural or environmental change",
  other: "Other",
};
const STATUS_LABELS: Record<TicketStatus, string> = { pending: "Pending review", accepted: "Accepted", rejected: "Rejected" };
const URGENCY_LABELS: Record<TicketUrgency, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function formatFileSize(size: number): string {
  return size < 1_000_000 ? `${Math.max(1, Math.round(size / 1000))} KB` : `${(size / 1_000_000).toFixed(1)} MB`;
}

export function TicketDetailPage() {
  const { ticketId = "" } = useParams();
  const location = useLocation();
  const tickets = useMemo(() => getTickets(), []);
  const ticket = tickets.find((item) => item.id === ticketId);
  const [reviews, setReviews] = useState<PeerReview[]>(() => ticket?.reviews ?? []);
  const [reviewDraft, setReviewDraft] = useState("");
  useEffect(() => {
    setReviews(ticket?.reviews ?? []);
    setReviewDraft("");
  }, [ticketId, ticket?.reviews]);
  const routeState = location.state as { returnTo?: unknown } | null;
  const returnTo = typeof routeState?.returnTo === "string" && routeState.returnTo.startsWith("/tickets")
    ? routeState.returnTo
    : "/tickets";

  if (!ticket) {
    return <div className="card bg-base-100 border border-base-300 detail-not-found"><div className="card-body"><span className="ticket-eyebrow">OBSERVATION NOT FOUND</span><h1>This report is no longer available</h1><p>Return to the community feed to choose another synthetic demonstration report.</p><Link className="btn btn-primary" to="/tickets">Back to observations</Link></div></div>;
  }
  const currentTicket = ticket;

  const rating = calculateRating(ticket.positiveVotes, ticket.negativeVotes);
  const related = tickets.filter((item) => item.id !== ticket.id && item.category === ticket.category).slice(0, 2);

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewDraft.trim()) return;
    const review = addPeerReview(currentTicket.id, reviewDraft);
    if (review) {
      setReviews((current) => [...current, review]);
      setReviewDraft("");
    }
  }

  return (
    <article className="ticket-detail-page">
      <Link className="back-link" to={returnTo}>← <span>Back to observations</span></Link>
      <header className="detail-heading">
        <div className="ticket-eyebrow">COMMUNITY OBSERVATION <span>·</span> {ticket.id}</div>
        <div className="detail-title-row"><h1>{ticket.title}</h1><span className={`badge badge-outline status-badge status-${ticket.status}`}>{STATUS_LABELS[ticket.status]}</span></div>
        <div className="detail-tag-row"><span className="badge badge-outline category-badge">{CATEGORY_LABELS[ticket.category]}</span><span className={`badge urgency-badge urgency-${ticket.urgency}`}>{URGENCY_LABELS[ticket.urgency]} urgency</span></div>
      </header>

      <div className="detail-grid">
        <div className="detail-main-column">
          <section className="card bg-base-100 border border-base-300 detail-content-card"><div className="card-body"><h2>Observation details</h2><p className="detail-description">{ticket.description}</p><dl className="detail-metadata"><div><dt>Geographical area</dt><dd>{ticket.location.areaName}</dd></div>{ticket.location.description && <div><dt>Location note</dt><dd>{ticket.location.description}</dd></div>}<div><dt>Observation date</dt><dd>{formatDate(ticket.observationDate)}</dd></div><div><dt>Submitted</dt><dd>{formatDate(ticket.createdAt)}</dd></div><div><dt>Reported by</dt><dd>{ticket.authorName} <span>(demo profile)</span></dd></div></dl><p className="location-disclaimer">Area names are illustrative. No precise coordinates or verified boundaries are attached to this demonstration record.</p></div></section>

          <section className="card bg-base-100 border border-base-300 detail-content-card"><div className="card-body"><div className="detail-section-heading"><h2>Supporting files</h2><span>{ticket.attachments.length} {ticket.attachments.length === 1 ? "file" : "files"}</span></div>{ticket.attachments.length ? <ul className="attachment-list">{ticket.attachments.map((file) => <li key={file.id}><span className="file-icon" aria-hidden="true">▤</span><span><strong>{file.name}</strong><small>{file.type} <i>·</i> {formatFileSize(file.size)} <i>·</i> demo metadata</small></span></li>)}</ul> : <p className="detail-empty-note">No supporting files were included in this demonstration report.</p>}<p className="location-disclaimer">Files shown here are mock metadata only; no file contents are stored or downloaded.</p></div></section>

          <section className="card bg-base-100 border border-base-300 detail-content-card review-card"><div className="card-body"><div className="detail-section-heading"><h2>Peer review</h2><span>{reviews.length + (ticket.reviewComment ? 1 : 0)} comments</span></div>{ticket.reviewComment && <article className="peer-review-entry"><strong>Researcher review · demo</strong><p>{ticket.reviewComment}</p></article>}{reviews.map((review) => <article className="peer-review-entry" key={review.id}><strong>{review.reviewerName} <span>· {formatDate(review.createdAt)}</span></strong><p>{review.comment}</p></article>)}{!ticket.reviewComment && reviews.length === 0 && <p className="detail-empty-note">No peer review comments yet. Add a note to start the discussion.</p>}<form className="peer-review-form" onSubmit={submitReview}><label htmlFor="peer-review-comment">Add a reviewer comment</label><textarea id="peer-review-comment" className="textarea textarea-bordered" value={reviewDraft} onChange={(event) => setReviewDraft(event.target.value)} rows={3} maxLength={800} required placeholder="Share a question, context, or evidence limitation" /><button className="btn btn-outline" type="submit">Post review comment</button></form><span className="review-disclaimer">Mock peer-review discussion only. Comments and ticket statuses do not establish scientific confirmation.</span></div></section>
        </div>

        <aside className="detail-side-column">
          <section className="card bg-base-100 border border-base-300 rating-detail-card"><div className="card-body"><span className="side-card-label">COMMUNITY RATING</span><div className="rating-large">{rating.toFixed(1)}<small>/100</small></div><progress className="progress progress-primary" value={rating} max="100" aria-label={`Community rating ${rating.toFixed(1)} out of 100`} /><p>Community perception only</p><div className="vote-count-row"><span>Useful <b>{ticket.positiveVotes}</b></span><span>Not convincing <b>{ticket.negativeVotes}</b></span></div><p className="rating-formula-note">Smoothed demo score using a neutral prior. Voting controls will be added in a later step.</p></div></section>
          <section className="card bg-base-100 border border-base-300 urgency-detail-card"><div className="card-body"><span className="side-card-label">URGENCY REPORTED</span><strong className={`urgency-text urgency-${ticket.urgency}`}>{URGENCY_LABELS[ticket.urgency]}</strong><p>Urgency is the reporter’s requested attention level. It is separate from confidence and review status.</p></div></section>
          {related.length > 0 && <section className="related-section"><h2>Related demo reports</h2>{related.map((item) => <Link className="related-link" key={item.id} to={`/tickets/${encodeURIComponent(item.id)}`} state={{ returnTo }}>{item.title}<span>{item.id} →</span></Link>)}</section>}
        </aside>
      </div>
    </article>
  );
}

