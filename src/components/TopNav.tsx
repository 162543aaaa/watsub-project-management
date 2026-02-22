import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, CheckSquare, FolderOpen, Users2, Calendar, Target,
  Users, Plane, Wallet, BarChart3, Bell, Upload, Zap, Menu, X, ChevronDown, Shield, LogOut
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";

const primaryNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Tasks", icon: CheckSquare, path: "/tasks" },
  { label: "Projects", icon: FolderOpen, path: "/projects" },
  { label: "Customers", icon: Users2, path: "/customers" },
  { label: "Calendar", icon: Calendar, path: "/calendar" },
];

const secondaryNav = [
  { label: "Goals", icon: Target, path: "/goals" },
  { label: "Team", icon: Users, path: "/team" },
  { label: "Leave", icon: Plane, path: "/leave" },
  { label: "Budget", icon: Wallet, path: "/budget" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Import", icon: Upload, path: "/import" },
];

const allNav = [...primaryNav, ...secondaryNav];

export default function TopNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { isAdmin, signOut, profile } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSecondaryActive = secondaryNav.some(n => location.pathname === n.path);

  return (
    <>
      {/* Top nav bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 gap-2"
        style={{
          background: "linear-gradient(90deg, hsl(222 47% 9%), hsl(222 50% 11%))",
          borderBottom: "1px solid hsl(222 47% 15%)",
          boxShadow: "0 2px 20px hsl(0 0% 0% / 0.25)",
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 mr-3">
          <img src="/logo_watsub.png" alt="WatSUB" className="w-8 h-8 object-contain" />
          <span className="hidden sm:block text-sm font-bold text-white leading-tight">WatSUB-Project Management</span>
        </Link>

        {/* Desktop primary nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1">
          {primaryNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <NavItem active={active} icon={item.icon} label={item.label} />
              </Link>
            );
          })}

        {/* More dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(v => !v)}
              className="top-nav-item flex items-center gap-1.5"
              style={isSecondaryActive || moreOpen ? {
                background: "hsl(191 91% 37% / 0.18)",
                color: "hsl(191 91% 65%)",
                borderBottom: "2px solid hsl(191 91% 45%)",
              } : {}}
            >
              <Menu className="w-3.5 h-3.5" />
              <span className="text-[12px] font-medium">More</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${moreOpen ? "rotate-180" : ""}`} />
              {/* Badge for notifications in more menu */}
              {unreadCount > 0 && !secondaryNav.find(n => n.path === "/notifications" && location.pathname === n.path) && (
                <span className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: "hsl(0 84% 60%)" }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {moreOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-52 rounded-2xl border overflow-hidden z-50 animate-scale-in"
                style={{
                  background: "hsl(222 47% 10%)",
                  borderColor: "hsl(222 47% 20%)",
                  boxShadow: "0 16px 48px hsl(0 0% 0% / 0.5), 0 4px 16px hsl(0 0% 0% / 0.3)",
                }}
              >
                <div className="p-1.5">
                  {secondaryNav.map((item) => {
                    const active = location.pathname === item.path;
                    const isNotif = item.path === "/notifications";
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}>
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer relative"
                          style={active ? {
                            background: "hsl(191 91% 37% / 0.2)",
                            color: "hsl(191 91% 70%)",
                          } : {
                            color: "hsl(215 20% 62%)",
                          }}
                          onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.background = "hsl(215 20% 100% / 0.08)"; (e.currentTarget as HTMLDivElement).style.color = "hsl(215 20% 88%)"; }}}
                          onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.background = ""; (e.currentTarget as HTMLDivElement).style.color = "hsl(215 20% 62%)"; }}}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: active ? "hsl(191 91% 37% / 0.25)" : "hsl(215 20% 100% / 0.06)" }}>
                            <item.icon className="w-3.5 h-3.5" />
                          </div>
                          <span>{item.label}</span>
                          {isNotif && unreadCount > 0 && (
                            <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                              style={{ background: "hsl(0 84% 60%)" }}>
                              {unreadCount}
                            </span>
                          )}
                          {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "hsl(191 91% 60%)" }} />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Tablet compact nav */}
        <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {allNav.map((item) => {
            const active = location.pathname === item.path;
            const isNotif = item.path === "/notifications";
            return (
              <Link key={item.path} to={item.path} className="relative flex-shrink-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer relative"
                  style={active ? {
                    background: "hsl(191 91% 37% / 0.18)",
                    color: "hsl(191 91% 65%)",
                  } : { color: "hsl(215 20% 60%)" }}
                  title={item.label}
                >
                  <item.icon className="w-4 h-4" />
                  {isNotif && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ background: "hsl(0 84% 60%)" }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Admin + Logout */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          {isAdmin && (
            <Link to="/admin">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                style={location.pathname === "/admin" ? { background: "hsl(191 91% 37% / 0.18)", color: "hsl(191 91% 65%)" } : { color: "hsl(215 20% 60%)" }}
                title="Admin Panel">
                <Shield className="w-4 h-4" />
              </div>
            </Link>
          )}
          <button onClick={signOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "hsl(215 20% 60%)" }}
            title="ออกจากระบบ">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
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
          <nav className="grid grid-cols-4 gap-1 p-3">
            {allNav.map((item) => {
              const active = location.pathname === item.path;
              const isNotif = item.path === "/notifications";
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all relative"
                    style={active ? {
                      background: "hsl(191 91% 37% / 0.18)",
                      color: "hsl(191 91% 65%)",
                    } : { color: "hsl(215 20% 60%)" }}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-[9px] font-medium">{item.label}</span>
                    {isNotif && unreadCount > 0 && (
                      <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ background: "hsl(0 84% 60%)" }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin">
                <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                  style={location.pathname === "/admin" ? { background: "hsl(191 91% 37% / 0.18)", color: "hsl(191 91% 65%)" } : { color: "hsl(215 20% 60%)" }}>
                  <Shield className="w-4 h-4" />
                  <span className="text-[9px] font-medium">Admin</span>
                </div>
              </Link>
            )}
            <button onClick={signOut}>
              <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all" style={{ color: "hsl(215 20% 60%)" }}>
                <LogOut className="w-4 h-4" />
                <span className="text-[9px] font-medium">Logout</span>
              </div>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}

function NavItem({ active, icon: Icon, label }: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div
      className="top-nav-item group relative"
      style={active ? {
        background: "hsl(191 91% 37% / 0.15)",
        color: "hsl(191 91% 65%)",
        borderBottom: "2px solid hsl(191 91% 45%)",
      } : {}}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      {/* Active dot indicator */}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{ background: "hsl(191 91% 55%)" }} />
      )}
    </div>
  );
}
