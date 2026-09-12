const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Dashboard"),
  "/my-work": () => import("@/pages/MyWork"),
  "/tasks": () => import("@/pages/Tasks"),
  "/projects": () => import("@/pages/Projects"),
  "/customers": () => import("@/pages/Customers"),
  "/calendar": () => import("@/pages/CalendarPage"),
  "/okrs": () => import("@/pages/OKRs"),
  "/team": () => import("@/pages/Team"),
  "/workload": () => import("@/pages/Workload"),
  "/manager": () => import("@/pages/ManagerDashboard"),
  "/organization": () => import("@/pages/Organization"),
  "/wiki": () => import("@/pages/Wiki"),
  "/meetings": () => import("@/pages/Meetings"),
  "/onsite-work": () => import("@/pages/OnsiteWork"),
  "/leave": () => import("@/pages/Leave"),
  "/budget": () => import("@/pages/Budget"),
  "/kpi/overview": () => import("@/pages/kpi/KpiOverview"),
  "/reports": () => import("@/pages/Reports"),
  "/notifications": () => import("@/pages/Notifications"),
  "/import": () => import("@/pages/ImportExport"),
  "/admin": () => import("@/pages/AdminPanel"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  const loader = routeLoaders[path];
  if (!loader || prefetched.has(path)) return;
  prefetched.add(path);
  void loader().catch(() => prefetched.delete(path));
}
