import { ArrowRightOnRectangleIcon, ArrowTrendingUpIcon, ArrowUpTrayIcon, Bars3Icon, BellIcon, BuildingOffice2Icon, CalendarIcon, ChartBarIcon, CheckBadgeIcon, ChevronDownIcon, FlagIcon, FolderOpenIcon, PaperAirplaneIcon, ShieldCheckIcon, Squares2X2Icon, UsersIcon, WalletIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useLocation, Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";

const primaryNav = [
  { label: "Dashboard", icon: Squares2X2Icon, path: "/" },
  { label: "My Work", icon: CheckBadgeIcon, path: "/my-work" },
  { label: "Tasks", icon: CheckBadgeIcon, path: "/tasks" },
  { label: "Projects", icon: FolderOpenIcon, path: "/projects" },
  { label: "Customers", icon: UsersIcon, path: "/customers" },
  { label: "Calendar", icon: CalendarIcon, path: "/calendar" },
];

const secondaryNav = [
  { label: "OKRs", icon: FlagIcon, path: "/okrs" },
  { label: "Team", icon: UsersIcon, path: "/team" },
  { label: "Organization", icon: BuildingOffice2Icon, path: "/organization" },
  { label: "Leave", icon: PaperAirplaneIcon, path: "/leave" },
  { label: "Budget", icon: WalletIcon, path: "/budget" },
  { label: "KPI", icon: ArrowTrendingUpIcon, path: "/kpi/overview" },
  { label: "Reports", icon: ChartBarIcon, path: "/reports" },
  { label: "Notifications", icon: BellIcon, path: "/notifications" },
  { label: "Import", icon: ArrowUpTrayIcon, path: "/import" },
];

const allNav = [...primaryNav, ...secondaryNav];

export default function TopNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { isAdmin, signOut } = useAuthContext();
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

  const isSecondaryActive = secondaryNav.some(n =>
    n.path === "/" ? location.pathname === "/" : location.pathname === n.path || location.pathname.startsWith(n.path + "/")
  );

  return (
    <>
      {/* Top nav bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 gap-2"
        style={{
          background: "#000000",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 mr-3">
          <img src="/logo_watsub.png" alt="WatSUB" className="w-8 h-8 object-contain" />
          <span className="hidden sm:block text-sm font-bold text-[#FC5A03] leading-tight">WatSUB-Project Management</span>
        </Link>

        {/* Desktop primary nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1" aria-label="Main navigation">
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
                background: "rgba(252, 90, 3, 0.15)",
                color: "#FC5A03",
                borderBottom: "2px solid #FC5A03",
              } : { color: "#FFC700" }}
            >
              <Bars3Icon className="w-3.5 h-3.5" />
              <span className="text-[12px] font-medium">More</span>
              <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${moreOpen ? "rotate-180" : ""}`} />
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
                  background: "#000000",
                  borderColor: "rgba(255,255,255,0.1)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                <div className="p-1.5">
                  {secondaryNav.map((item) => {
                    const active = item.path === "/" ? location.pathname === "/" : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                    const isNotif = item.path === "/notifications";
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}>
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer relative"
                          style={active ? {
                            background: "rgba(252, 90, 3, 0.15)",
                            color: "#FC5A03",
                          } : {
                            color: "#FFC700",
                          }}
                          onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 199, 0, 0.1)"; (e.currentTarget as HTMLDivElement).style.color = "#FFC700"; }}}
                          onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.background = ""; (e.currentTarget as HTMLDivElement).style.color = "#FFC700"; }}}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: active ? "rgba(252, 90, 3, 0.25)" : "rgba(255, 199, 0, 0.1)" }}>
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
        <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar" aria-label="Main navigation">
          {allNav.map((item) => {
            const active = location.pathname === item.path;
            const isNotif = item.path === "/notifications";
            return (
              <Link key={item.path} to={item.path} className="relative flex-shrink-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 cursor-pointer relative"
                  style={active ? {
                    background: "rgba(252, 90, 3, 0.15)",
                    color: "#FC5A03",
                  } : { color: "#FFC700" }}
                  title={item.label}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 199, 0, 0.1)"; }}}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.background = ""; }}}
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
            <>
              <Link to="/admin">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                  style={location.pathname === "/admin" ? { background: "rgba(252, 90, 3, 0.15)", color: "#FC5A03" } : { color: "#FFC700" }}
                  title="Admin Panel"
                  aria-label="Admin Panel"
                  onMouseEnter={e => { if (location.pathname !== "/admin") (e.currentTarget as HTMLDivElement).style.background = "rgba(255, 199, 0, 0.1)"; }}
                  onMouseLeave={e => { if (location.pathname !== "/admin") (e.currentTarget as HTMLDivElement).style.background = ""; }}
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                </div>
              </Link>
            </>
          )}
          <button onClick={signOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#FFC700" }}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 199, 0, 0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; }}
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "#FFC700" }}
          aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 199, 0, 0.1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; }}
        >
          {mobileOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="fixed top-14 left-0 right-0 z-30 md:hidden border-b"
          style={{
            background: "#000000",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
          onClick={() => setMobileOpen(false)}
        >
          <nav className="grid grid-cols-4 gap-1 p-3" aria-label="Mobile navigation">
            {allNav.map((item) => {
              const active = location.pathname === item.path;
              const isNotif = item.path === "/notifications";
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all relative"
                    style={active ? {
                      background: "rgba(252, 90, 3, 0.15)",
                      color: "#FC5A03",
                    } : { color: "#FFC700" }}
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
              <>
                <Link to="/admin">
                  <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                    style={location.pathname === "/admin" ? { background: "rgba(252, 90, 3, 0.15)", color: "#FC5A03" } : { color: "#FFC700" }}>
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span className="text-[9px] font-medium">Admin</span>
                  </div>
                </Link>
              </>
            )}
            <button onClick={signOut}>
              <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all" style={{ color: "#FFC700" }}>
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
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
