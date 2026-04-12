import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import AIChatbot from "./AIChatbot";

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pt-14 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
      <AIChatbot />
    </div>
  );
}
