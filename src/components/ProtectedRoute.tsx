import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { GlobalLoadingScreen } from "@/components/LoadingScreen";

export default function ProtectedRoute() {
  const { user, isApproved, isAdmin, loading, canAccessPage } = useAuthContext();
  const location = useLocation();

  // Show spinner only on initial load (no user yet).
  // If user is already set, render content immediately — background auth events
  // (e.g. sign-in from another tab) update in place without blanking the page.
  if (loading && !user) return <GlobalLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && !isAdmin) return <Navigate to="/waiting-approval" replace />;

  // Admin-only pages (covers sub-paths like /kpi/admin/new-period, /kpi/admin/summary/:id)
  if (location.pathname === "/admin" && !isAdmin) return <Navigate to="/" replace />;
  if ((location.pathname === "/kpi/admin" || location.pathname.startsWith("/kpi/admin/")) && !isAdmin)
    return <Navigate to="/kpi/overview" replace />;

  // KPI evaluation pages (overview/evaluate/report/dashboard) are open to every
  // approved member — everyone must be able to submit evaluations. Only
  // /kpi/admin (handled above) is restricted to admins.
  const isKpiPage = location.pathname.startsWith("/kpi");
  if (!isKpiPage && !canAccessPage(location.pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-sm text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อ Admin</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
