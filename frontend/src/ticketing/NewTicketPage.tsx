import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createTicket } from "./ticket-service";
import type { TicketCategory, TicketUrgency } from "./ticket-types";

export function NewTicketPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const areaName = String(data.get("area") ?? "").trim();
    const observationDate = String(data.get("observationDate") ?? "");
    if (!title || !description || !areaName || !observationDate) {
      setError("Complete each required field before sharing the report.");
      return;
    }

    const ticket = createTicket({
      title,
      description,
      areaName,
      observationDate,
      category: String(data.get("category")) as TicketCategory,
      urgency: String(data.get("urgency")) as TicketUrgency,
    });
    navigate(`/tickets/${encodeURIComponent(ticket.id)}`);
  }

  return (
    <section className="new-ticket-page">
      <Link className="back-link" to="/tickets">← <span>Back to observations</span></Link>
      <header className="new-ticket-heading">
        <div className="ticket-eyebrow">COMMUNITY FIELD NOTES <span>·</span> NEW REPORT</div>
        <h1>Share a research report</h1>
        <p>Describe the observation and its context so other researchers can review it.</p>
      </header>
      <div className="alert alert-info demo-notice" role="note">
        <span className="notice-icon" aria-hidden="true">i</span>
        <span>This prototype stores synthetic demonstration reports in this browser only. Reports are not scientific findings.</span>
      </div>
      <form className="card bg-base-100 border border-base-300 new-ticket-form" onSubmit={submit}>
        <div className="card-body">
          <label className="new-ticket-field"><span>Report title</span><input className="input input-bordered" name="title" maxLength={120} required placeholder="Summarize the observation" /></label>
          <label className="new-ticket-field"><span>Observation and context</span><textarea className="textarea textarea-bordered" name="description" maxLength={1600} required rows={5} placeholder="What did you observe, and what evidence or context should reviewers consider?" /></label>
          <div className="new-ticket-field-grid">
            <label className="new-ticket-field"><span>Category</span><select className="select select-bordered" name="category" defaultValue="agricultural-change"><option value="vegetation-anomaly">Vegetation anomaly</option><option value="suspected-drought">Suspected drought</option><option value="flood">Flood or inundation</option><option value="wildfire">Wildfire impact</option><option value="land-movement">Land-surface movement</option><option value="agricultural-change">Agricultural or environmental change</option><option value="other">Other</option></select></label>
            <label className="new-ticket-field"><span>Reported urgency</span><select className="select select-bordered" name="urgency" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label className="new-ticket-field"><span>Area name</span><input className="input input-bordered" name="area" required placeholder="For example, Haouz Plain" /></label>
            <label className="new-ticket-field"><span>Observation date</span><input className="input input-bordered" name="observationDate" type="date" required /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="new-ticket-actions"><Link className="btn btn-ghost" to="/tickets">Cancel</Link><button className="btn btn-primary" type="submit">Submit for peer review</button></div>
          <p className="new-ticket-footnote">New reports begin as “Pending review.” This mock workflow does not verify evidence or establish scientific validity.</p>
        </div>
      </form>
    </section>
  );
}
