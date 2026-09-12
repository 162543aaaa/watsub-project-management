import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function Layout() {
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
        <Outlet />
      </main>
    </div>
  );
}
