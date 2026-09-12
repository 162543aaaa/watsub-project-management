import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import RouteLoadingFallback from "./RouteLoadingFallback";
import { prefetchRoute } from "@/lib/routePrefetch";

export default function Layout() {
  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || connection?.effectiveType?.includes("2g")) return;

    const warmRoutes = () => {
      ["/", "/my-work", "/tasks", "/projects", "/customers", "/calendar"].forEach(prefetchRoute);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmRoutes, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = window.setTimeout(warmRoutes, 1200);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="min-h-screen bg-transparent">
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-[100] rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background focus:not-sr-only"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="min-h-[calc(100vh-4rem)] scroll-mt-20 pt-16">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
