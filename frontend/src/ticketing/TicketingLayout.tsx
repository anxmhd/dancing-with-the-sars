import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import "./ticketing.css";

export function TicketingLayout() {
  const location = useLocation();
  const onTicketSection = location.pathname.startsWith("/tickets");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="ticketing-app" data-theme="light">
      <header className="ticket-topbar">
        <Link className="ticket-brand" to="/tickets" aria-label="Environmental observations home">
          <span className="ticket-brand-mark" aria-hidden="true">D</span>
          <span><strong>Dancing with the SARs</strong><small>Community observations</small></span>
        </Link>
        <nav className="ticket-main-nav" aria-label="Main navigation">
          <Link className="ticket-nav-link" to="/">Study area</Link>
          <Link className={`ticket-nav-link ${onTicketSection ? "active" : ""}`} to="/tickets" aria-current={onTicketSection ? "page" : undefined}>Environmental observations</Link>
        </nav>
        <span className="badge badge-outline ticket-demo-badge"><span aria-hidden="true" /> Demo workspace</span>
      </header>
      <main className="ticket-main">
        <Outlet />
      </main>
      <footer className="ticket-footer">
        <span>Demonstration records only · Not verified environmental observations</span>
        <span>Dancing with the SARs <b>·</b> Community</span>
      </footer>
    </div>
  );
}

