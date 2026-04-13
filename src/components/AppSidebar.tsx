import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, CheckSquare, FolderOpen, Users2, Calendar, Target,
  Users, Plane, Wallet, BarChart3, Bell, Upload, Download, ChevronLeft, ChevronRight, Zap, Video, MapPin, TrendingUp,
  BookOpen, LayoutGrid
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Tasks", icon: CheckSquare, path: "/tasks" },
  { label: "Projects", icon: FolderOpen, path: "/projects" },
  { label: "Customers", icon: Users2, path: "/customers" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
  { label: "OKRs", icon: Target, path: "/okrs" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Team Workload", icon: LayoutGrid, path: "/workload" },
  { label: "Wiki", icon: BookOpen, path: "/wiki" },
  { label: "Meetings", icon: Video, path: "/meetings" },
  { label: "On-site Work", icon: MapPin, path: "/onsite-work" },
  { label: "Leave", icon: Plane, path: "/leave" },
  { label: "Budget", icon: Wallet, path: "/budget" },
  { label: "KPI", icon: TrendingUp, path: "/kpi/overview" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Import", icon: Upload, path: "/import" },
  { label: "Export", icon: Download, path: "/export" },
];

export default function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { unreadCount } = useNotifications();
  const { isAdmin } = useAuthContext();

  return (
    <aside
      className="relative flex flex-col h-screen transition-all duration-300 ease-out flex-shrink-0"
      style={{
        width: collapsed ? 72 : 240,
        background: "linear-gradient(180deg, hsl(222 47% 9%), hsl(222 50% 7%))",
        borderRight: "1px solid hsl(222 47% 15%)"
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "hsl(222 47% 15%)" }}>
        <img src="/logo_watsub.png" alt="WatSUB" className="w-9 h-9 object-contain flex-shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-white leading-tight">WatSUB</div>
            <div className="text-xs" style={{ color: "hsl(215 20% 55%)" }}>Project Management</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const active = item.path === "/"
            ? location.pathname === "/"
            : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          const isNotif = item.path === "/notifications";
          return (
            <Link key={item.path} to={item.path}>
              <div
                className="nav-item group relative"
                style={active ? {
                  background: "hsl(191 91% 37% / 0.15)",
                  color: "hsl(191 91% 55%)",
                  borderLeft: "3px solid hsl(191 91% 45%)",
                  paddingLeft: collapsed ? "10px" : "10px"
                } : {}}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-[18px] h-[18px]" style={{ flexShrink: 0 }} />
                  {isNotif && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: "hsl(0 84% 60%)" }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="text-[13px] font-medium truncate">{item.label}</span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
                    style={{ background: "hsl(222 47% 15%)", color: "hsl(215 20% 90%)", boxShadow: "0 4px 12px hsl(0 0% 0% / 0.3)" }}>
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          );
        })}

      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 z-10"
        style={{
          background: "hsl(222 47% 12%)",
          borderColor: "hsl(222 47% 20%)",
          color: "hsl(215 20% 70%)"
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
