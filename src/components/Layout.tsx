import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pt-14 min-h-[calc(100vh-3.5rem)]">
        <Outlet />
      </main>
    </div>
  );
}
