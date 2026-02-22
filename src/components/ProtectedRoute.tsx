import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
  const { user, isApproved, isAdmin, loading, canAccessPage } = useAuthContext();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && !isAdmin) return <Navigate to="/waiting-approval" replace />;

  // Check page access (admin panel always accessible for admins)
  if (location.pathname === "/admin" && !isAdmin) return <Navigate to="/" replace />;
  if (!canAccessPage(location.pathname)) {
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
