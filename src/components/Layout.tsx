import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import DelicateAsciiDots from "./DelicateAsciiDots";

export default function Layout() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <DelicateAsciiDots />
      <TopNav />
      <main className="pt-14 min-h-[calc(100vh-3.5rem)] relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
