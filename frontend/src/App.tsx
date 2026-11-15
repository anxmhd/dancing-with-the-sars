/*import { Route, Routes } from "react-router-dom";
import { AgriculturalOverview } from "./advisor/AdvisorDashboard";
import { GuestOnly, RequireAuth, RoleLandingRedirect } from "./auth/RequireAuth";
import { LoginPage } from "./auth/LoginPage";
import { StudyAreaExplorer } from "./study-area/StudyAreaExplorer";
import { TicketDetailPage } from "./ticketing/TicketDetailPage";
import { TicketingLayout } from "./ticketing/TicketingLayout";
import { TicketListPage } from "./ticketing/TicketListPage";

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<RequireAuth role="advisor" />}>
        <Route path="/advisor/dashboard" element={<AgriculturalOverview />} />
      </Route>
      <Route element={<RequireAuth role="researcher" />}>
        <Route path="/researcher/dashboard" element={<StudyAreaExplorer />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/tickets" element={<TicketingLayout />}>
          <Route index element={<TicketListPage />} />
          <Route path=":ticketId" element={<TicketDetailPage />} />
        </Route>
      </Route>
      <Route path="/" element={<RoleLandingRedirect />} />
      <Route path="*" element={<RoleLandingRedirect />} />
    </Routes>
  );
}
*/

import { Route, Routes } from "react-router-dom";
import { AgriculturalOverview } from "./advisor/AdvisorDashboard";
import { LoginPage } from "./auth/LoginPage";
import { StudyAreaExplorer } from "./study-area/StudyAreaExplorer";
import { TicketDetailPage } from "./ticketing/TicketDetailPage";
import { TicketingLayout } from "./ticketing/TicketingLayout";
import { TicketListPage } from "./ticketing/TicketListPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/advisor/dashboard" element={<AgriculturalOverview />} />

      <Route path="/researcher/dashboard" element={<StudyAreaExplorer />} />

      <Route path="/tickets" element={<TicketingLayout />}>
        <Route index element={<TicketListPage />} />
        <Route path=":ticketId" element={<TicketDetailPage />} />
      </Route>

      <Route path="/" element={<AgriculturalOverview />} />
      <Route path="*" element={<AgriculturalOverview />} />
    </Routes>
  );
}
