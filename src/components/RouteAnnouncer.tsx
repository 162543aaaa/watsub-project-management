import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/projects": "Projects",
  "/customers": "Customers",
  "/calendar": "Calendar",
  "/team": "Team",
  "/workload": "Team Workload",
  "/manager": "Studio Overview",
  "/organization": "Organization",
  "/wiki": "Company Wiki",
  "/meetings": "Meetings",
  "/onsite-work": "On-site Work",
  "/leave": "Leave",
  "/budget": "Budget",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/login": "Sign in",
  "/signup": "Sign up",
};

function resolveTitle(pathname: string) {
  const exact = ROUTE_TITLES[pathname];
  if (exact) return exact;
  const parent = Object.keys(ROUTE_TITLES)
    .filter((path) => path !== "/" && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return parent ? ROUTE_TITLES[parent] : "WatSUB Studio OS";
}
export default function RouteAnnouncer() {
  const { pathname } = useLocation();
  const title = resolveTitle(pathname);

  useEffect(() => {
    document.title = `${title} | WatSUB`;
  }, [title]);

  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {title}
    </div>
  );
}
