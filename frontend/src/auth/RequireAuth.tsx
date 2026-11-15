import { Navigate, Outlet, useLocation } from "react-router-dom";
import { dashboardPathForUser, roleForUser, type AppRole } from "./roles";
import { useAuth } from "./AuthProvider";

interface RequireAuthProps {
  role?: AppRole;
}

export function RequireAuth({ role }: RequireAuthProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <main className="auth-route-loading" role="status" aria-live="polite">Restoring your demo session…</main>;
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role && roleForUser(user) !== role) {
    return <Navigate to={dashboardPathForUser(user)} replace />;
  }
  return <Outlet />;
}

export function RoleLandingRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <main className="auth-route-loading" role="status" aria-live="polite">Restoring your demo session…</main>;
  }
  return <Navigate to={isAuthenticated && user ? dashboardPathForUser(user) : "/login"} replace />;
}

export function GuestOnly() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <main className="auth-route-loading" role="status" aria-live="polite">Restoring your demo session…</main>;
  }
  if (isAuthenticated && user) return <Navigate to={dashboardPathForUser(user)} replace />;
  return <Outlet />;
}
