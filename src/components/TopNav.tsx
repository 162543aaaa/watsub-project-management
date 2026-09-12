import {
  ArrowRightOnRectangleIcon,
  ArrowTrendingUpIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  BellIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  FlagIcon,
  FolderOpenIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
  VideoCameraIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuthContext } from "@/contexts/AuthContext";
import { prefetchRoute } from "@/lib/routePrefetch";

const primaryNav = [
  { label: "Dashboard", icon: Squares2X2Icon, path: "/" },
  { label: "My Work", icon: CheckBadgeIcon, path: "/my-work" },
  { label: "Tasks", icon: CheckBadgeIcon, path: "/tasks" },
  { label: "Projects", icon: FolderOpenIcon, path: "/projects" },
  { label: "Customers", icon: UsersIcon, path: "/customers" },
  { label: "Calendar", icon: CalendarIcon, path: "/calendar" },
];

const moreGroups = [
  {
    label: "Team",
    items: [
      { label: "Team", icon: UsersIcon, path: "/team" },
      { label: "Workload", icon: Squares2X2Icon, path: "/workload" },
      { label: "Manager", icon: ChartBarIcon, path: "/manager" },
      { label: "Organization", icon: BuildingOffice2Icon, path: "/organization" },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "OKRs", icon: FlagIcon, path: "/okrs" },
      { label: "Meetings", icon: VideoCameraIcon, path: "/meetings" },
      { label: "On-site Work", icon: MapPinIcon, path: "/onsite-work" },
      { label: "Leave", icon: PaperAirplaneIcon, path: "/leave" },
    ],
  },
  {
    label: "Studio",
    items: [
      { label: "Wiki", icon: BookOpenIcon, path: "/wiki" },
      { label: "Budget", icon: WalletIcon, path: "/budget" },
      { label: "KPI", icon: ArrowTrendingUpIcon, path: "/kpi/overview" },
      { label: "Reports", icon: ChartBarIcon, path: "/reports" },
      { label: "Notifications", icon: BellIcon, path: "/notifications" },
      { label: "Import", icon: ArrowUpTrayIcon, path: "/import" },
    ],
  },
];

const moreNav = moreGroups.flatMap((group) => group.items);

function isActivePath(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function TopNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { isAdmin, signOut } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = moreNav.some((item) => isActivePath(location.pathname, item.path));

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function closeMenus(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && moreRef.current?.contains(event.target as Node)) return;
      setMoreOpen(false);
    }
    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);

  return (
    <>
      <header className="app-topnav">
        <Link to="/" onMouseEnter={() => prefetchRoute("/")} onFocus={() => prefetchRoute("/")} onTouchStart={() => prefetchRoute("/")} className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="WatSUB Studio OS home">
          <img src="/logo_watsub-192.webp" alt="WatSUB" className="h-8 w-8 flex-shrink-0 object-contain" />
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-bold tracking-tight text-sidebar-accent-foreground">WatSUB</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground">Studio OS</div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main navigation">
          {primaryNav.map((item) => (
            <NavItem
              key={item.path}
              active={isActivePath(location.pathname, item.path)}
              icon={item.icon}
              label={item.label}
              path={item.path}
            />
          ))}

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={`top-nav-item ${moreActive || moreOpen ? "top-nav-item-active" : ""}`}
              aria-expanded={moreOpen}
              aria-controls="more-navigation"
            >
              <Bars3Icon className="h-4 w-4" />
              <span>More</span>
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              {unreadCount > 0 && <NotificationBadge count={unreadCount} compact />}
            </button>

            {moreOpen && (
              <div id="more-navigation" className="top-nav-panel" aria-label="More navigation">
                {moreGroups.map((group) => (
                  <div key={group.label} className="min-w-0">
                    <p className="top-nav-group-label">{group.label}</p>
                    <div className="mt-1 space-y-1">
                      {group.items.map((item) => {
                        const active = isActivePath(location.pathname, item.path);
                        const isNotif = item.path === "/notifications";
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onMouseEnter={() => prefetchRoute(item.path)}
                            onFocus={() => prefetchRoute(item.path)}
                            onTouchStart={() => prefetchRoute(item.path)}
                            role="menuitem"
                            className={`top-nav-menu-item ${active ? "top-nav-menu-item-active" : ""}`}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {isNotif && unreadCount > 0 && <NotificationBadge count={unreadCount} />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {isAdmin && (
            <Link
              to="/admin"
              className={`top-nav-icon-button ${isActivePath(location.pathname, "/admin") ? "top-nav-icon-button-active" : ""}`}
              aria-label="Admin Panel"
              title="Admin Panel"
            >
              <ShieldCheckIcon className="h-4 w-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="top-nav-icon-button"
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="top-nav-icon-button ml-auto md:ml-0 lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
        >
          {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </header>

      {mobileOpen && (
        <div id="mobile-navigation" className="top-nav-mobile-panel lg:hidden">
          <nav className="space-y-4" aria-label="Mobile navigation">
            <div>
              <p className="top-nav-group-label">Workspace</p>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {primaryNav.map((item) => (
                  <MobileNavItem key={item.path} item={item} pathname={location.pathname} />
                ))}
              </div>
            </div>
            {moreGroups.map((group) => (
              <div key={group.label}>
                <p className="top-nav-group-label">{group.label}</p>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {group.items.map((item) => (
                    <MobileNavItem
                      key={item.path}
                      item={item}
                      pathname={location.pathname}
                      count={item.path === "/notifications" ? unreadCount : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-1.5 border-t border-sidebar-border pt-3">
              {isAdmin && (
                <MobileNavItem
                  item={{ label: "Admin", icon: ShieldCheckIcon, path: "/admin" }}
                  pathname={location.pathname}
                />
              )}
              <button type="button" onClick={signOut} className="top-nav-mobile-item">
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function NavItem({ active, icon: Icon, label, path }: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}) {
  return (
    <Link
      to={path}
      onMouseEnter={() => prefetchRoute(path)}
      onFocus={() => prefetchRoute(path)}
      onTouchStart={() => prefetchRoute(path)}
      className={`top-nav-item ${active ? "top-nav-item-active" : ""}`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function NotificationBadge({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <span className={compact ? "notification-badge notification-badge-compact" : "notification-badge"}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function MobileNavItem({ item, pathname, count }: {
  item: { label: string; icon: React.ComponentType<{ className?: string }>; path: string };
  pathname: string;
  count?: number;
}) {
  const active = isActivePath(pathname, item.path);
  return (
    <Link
      to={item.path}
      onMouseEnter={() => prefetchRoute(item.path)}
      onFocus={() => prefetchRoute(item.path)}
      onTouchStart={() => prefetchRoute(item.path)}
      className={`top-nav-mobile-item ${active ? "top-nav-mobile-item-active" : ""}`}
    >
      <item.icon className="h-4 w-4" />
      <span className="truncate">{item.label}</span>
      {count ? <NotificationBadge count={count} /> : null}
    </Link>
  );
}
