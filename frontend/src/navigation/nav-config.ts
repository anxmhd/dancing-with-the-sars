export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly icon: string;
  readonly badge?: string;
}

/** Navigation items for scientific accounts (Researcher Dashboard). */
export const RESEARCHER_NAV: readonly NavItem[] = [
  { id: "r-dashboard", label: "Dashboard", path: "/researcher/dashboard", icon: "📊" },
  { id: "r-vegetation", label: "Vegetation Analysis", path: "/researcher/vegetation", icon: "🌿" },
  { id: "r-radar", label: "Radar Monitoring", path: "/researcher/radar", icon: "📡" },
  { id: "r-climate", label: "Climate Data", path: "/researcher/climate", icon: "🌤️" },
  { id: "r-publications", label: "Publications", path: "/researcher/publications", icon: "📄" },
];

/** Navigation items for regular accounts (Agricultural Advisor Dashboard). */
export const ADVISOR_NAV: readonly NavItem[] = [
  { id: "a-dashboard", label: "Dashboard", path: "/advisor/dashboard", icon: "📊" },
  { id: "a-field-reports", label: "Field Reports", path: "/advisor/field-reports", icon: "📋" },
  { id: "a-crop-monitoring", label: "Crop Monitoring", path: "/advisor/crop-monitoring", icon: "🌾" },
  { id: "a-irrigation", label: "Irrigation Guidance", path: "/advisor/irrigation", icon: "💧" },
  { id: "a-alerts", label: "Alerts", path: "/advisor/alerts", icon: "🔔" },
];
