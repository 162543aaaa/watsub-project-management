import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, CheckSquare, FolderOpen, Users2, Calendar, Target,
  Users, Plane, Wallet, BarChart3, Bell, Upload, Zap, Menu, X
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Tasks", icon: CheckSquare, path: "/tasks" },
  { label: "Projects", icon: FolderOpen, path: "/projects" },
  { label: "Customers", icon: Users2, path: "/customers" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
  { label: "Goals", icon: Target, path: "/goals" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Leave", icon: Plane, path: "/leave" },
  { label: "Budget", icon: Wallet, path: "/budget" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Import", icon: Upload, path: "/import" },
];

export default function TopNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Top nav bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 gap-4"
        style={{
          background: "linear-gradient(90deg, hsl(222 47% 9%), hsl(222 50% 11%))",
          borderBottom: "1px solid hsl(222 47% 15%)",
          boxShadow: "0 2px 20px hsl(0 0% 0% / 0.25)",
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 mr-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center animate-float"
            style={{ background: "linear-gradient(135deg, hsl(191 91% 37%), hsl(200 91% 47%))" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-white leading-tight">Project Hub</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const isNotif = item.path === "/notifications";
            return (
              <Link key={item.path} to={item.path} className="relative flex-shrink-0">
                <div
                  className="top-nav-item group"
                  style={active ? {
                    background: "hsl(191 91% 37% / 0.18)",
                    color: "hsl(191 91% 65%)",
                    borderBottom: "2px solid hsl(191 91% 45%)",
                  } : {}}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[12px] font-medium">{item.label}</span>
                  {isNotif && unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: "hsl(0 84% 60%)" }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Tablet compact nav */}
        <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const isNotif = item.path === "/notifications";
            return (
              <Link key={item.path} to={item.path} className="relative flex-shrink-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer relative"
                  style={active ? {
                    background: "hsl(191 91% 37% / 0.18)",
                    color: "hsl(191 91% 65%)",
                  } : {
                    color: "hsl(215 20% 60%)",
                  }}
                  title={item.label}
                >
                  <item.icon className="w-4 h-4" />
                  {isNotif && unreadCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ background: "hsl(0 84% 60%)" }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: "hsl(215 20% 70%)" }}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="fixed top-14 left-0 right-0 z-30 md:hidden border-b"
          style={{
            background: "linear-gradient(180deg, hsl(222 47% 10%), hsl(222 50% 8%))",
            borderColor: "hsl(222 47% 15%)",
          }}
          onClick={() => setMobileOpen(false)}
        >
          <nav className="grid grid-cols-3 gap-1 p-3">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const isNotif = item.path === "/notifications";
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all relative"
                    style={active ? {
                      background: "hsl(191 91% 37% / 0.18)",
                      color: "hsl(191 91% 65%)",
                    } : {
                      color: "hsl(215 20% 60%)",
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                    {isNotif && unreadCount > 0 && (
                      <span
                        className="absolute top-1 right-3 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ background: "hsl(0 84% 60%)" }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
