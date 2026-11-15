import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { ADVISOR_NAV } from "../navigation/nav-config";
import { getTickets } from "../ticketing/ticket-service";
import { ADVISOR_OVERVIEW } from "./advisor-overview-data";
import "./advisor-dashboard.css";

export function AgriculturalOverview() {
  const { user, logout } = useAuth();
  const acceptedDemoReports = getTickets().filter((ticket) => ticket.status === "accepted").length;

  return (
    <div className="advisor-shell" data-theme="light">
      <aside className="advisor-sidebar" aria-label="Agricultural advisor navigation">
        <Link className="advisor-brand" to={ADVISOR_NAV[0].path}>
          <span className="advisor-brand-mark" aria-hidden="true">D</span>
          <span><strong>Dancing with the SARs</strong><small>Agricultural workspace</small></span>
        </Link>
        <div className="advisor-workspace-label">ADVISOR WORKSPACE</div>
        <nav className="advisor-nav" aria-label="Main navigation">
          <Link className="advisor-nav-link active" to={ADVISOR_NAV[0].path} aria-current="page">
            <span aria-hidden="true">⌂</span>{ADVISOR_NAV[0].label}
          </Link>
          <Link className="advisor-nav-link" to="/tickets">
            <span aria-hidden="true">▤</span>Community observations
          </Link>
        </nav>
        <div className="advisor-profile">
          <span className="advisor-avatar" aria-hidden="true">{user?.fullName.charAt(0) ?? "A"}</span>
          <span><strong>{user?.fullName ?? "Demo advisor"}</strong><small>Agricultural advisor · demo user</small></span>
        </div>
      </aside>

      <main className="advisor-main">
        <header className="advisor-topbar">
          <div className="advisor-breadcrumb"><span>Advisor workspace</span><span aria-hidden="true">/</span><strong>Regional overview</strong></div>
          <div className="advisor-session-group">
            <span className="advisor-session"><i aria-hidden="true" /> Demo session · {user?.fullName ?? "Agricultural advisor"}</span>
            <button className="advisor-signout" type="button" onClick={() => void logout()}>Sign out</button>
          </div>
        </header>

        <div className="advisor-content">
          <section className="advisor-heading">
            <div>
              <div className="advisor-eyebrow">AGRICULTURAL ADVISOR · 01</div>
              <h1>Regional overview</h1>
              <p>Environmental monitoring context for agricultural planning in the Haouz Plain.</p>
            </div>
            <span className="badge badge-outline advisor-synthetic-badge">Synthetic example</span>
          </section>

          <div className="alert advisor-demo-alert" role="note">
            <span className="advisor-info-mark" aria-hidden="true">i</span>
            <span>This is a demonstration view. It contains no verified environmental measurements, scientific findings, or agricultural recommendations.</span>
          </div>

          <section className="advisor-region-card card bg-base-100 border border-base-300" aria-labelledby="advisor-region-title">
            <div className="advisor-region-symbol" aria-hidden="true">⌖</div>
            <div className="advisor-region-copy">
              <span className="advisor-card-kicker">SELECTED AGRICULTURAL REGION</span>
              <h2 id="advisor-region-title">{ADVISOR_OVERVIEW.region}</h2>
              <p>{ADVISOR_OVERVIEW.subregion} <span>·</span> Illustrative regional context</p>
            </div>
            <Link className="btn btn-outline advisor-map-link" to="/">Open study area map <span aria-hidden="true">→</span></Link>
          </section>

          <section className="advisor-summary-grid" aria-label="Regional monitoring summary">
            <article className="advisor-summary-card card bg-base-100 border border-base-300">
              <span className="advisor-card-kicker">MONITORING</span>
              <strong className="advisor-summary-value">Not connected</strong>
              <p>{ADVISOR_OVERVIEW.monitoringStatus}</p>
            </article>
            <article className="advisor-summary-card card bg-base-100 border border-base-300">
              <span className="advisor-card-kicker">SCIENTIFIC VALIDATION</span>
              <strong className="advisor-summary-value">0 verified</strong>
              <p>{ADVISOR_OVERVIEW.scientificValidationStatus}</p>
            </article>
            <article className="advisor-summary-card card bg-base-100 border border-base-300">
              <span className="advisor-card-kicker">COMMUNITY WORKFLOW</span>
              <strong className="advisor-summary-value">{acceptedDemoReports} accepted demo {acceptedDemoReports === 1 ? "report" : "reports"}</strong>
              <p>Accepted in the mock ticket workflow; this is not scientific validation.</p>
            </article>
          </section>

          <section className="advisor-overview-grid">
            <article className="advisor-panel card bg-base-100 border border-base-300">
              <div className="advisor-panel-heading">
                <div><span className="advisor-card-kicker">ENVIRONMENTAL CONDITIONS</span><h2>Regional condition summaries</h2></div>
                <span className="badge badge-outline advisor-unavailable-badge">No verified data</span>
              </div>
              <div className="advisor-condition-list">
                {ADVISOR_OVERVIEW.conditionSummaries.map((condition) => (
                  <div className="advisor-condition" key={condition.title}>
                    <span className="advisor-condition-dot" aria-hidden="true" />
                    <div><h3>{condition.title}</h3><p>{condition.detail}</p></div>
                    <span className="advisor-condition-status">{condition.status}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="advisor-panel advisor-risk-panel card bg-base-100 border border-base-300">
              <div className="advisor-panel-heading">
                <div><span className="advisor-card-kicker">ENVIRONMENTAL RISKS</span><h2>Potential concerns</h2></div>
                <span className="badge badge-outline advisor-unavailable-badge">Unassessed</span>
              </div>
              <p className="advisor-panel-intro">These are monitoring topics only. No regional risk level has been established.</p>
              <div className="advisor-risk-list">
                {ADVISOR_OVERVIEW.potentialConcerns.map((concern) => (
                  <div className="advisor-risk-item" key={concern.title}>
                    <div><h3>{concern.title}</h3><span>{concern.status}</span></div>
                    <p>{concern.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="advisor-history-panel card bg-base-100 border border-base-300" aria-labelledby="advisor-history-title">
            <div className="advisor-history-icon" aria-hidden="true">↗</div>
            <div>
              <span className="advisor-card-kicker">HISTORICAL COMPARISON</span>
              <h2 id="advisor-history-title">Comparison unavailable</h2>
              <p>{ADVISOR_OVERVIEW.historicalStatus}. No trend or change is inferred in this overview.</p>
            </div>
            <Link to="/tickets" className="advisor-history-link">View community reports <span aria-hidden="true">→</span></Link>
          </section>

          <footer className="advisor-footer">
            <span>{ADVISOR_OVERVIEW.syntheticLabel} · For interface demonstration only</span>
            <span>Accepted community status does not establish scientific validity.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
