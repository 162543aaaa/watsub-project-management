import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FlowingRibbons from "@/components/FlowingRibbons";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Customers from "./pages/Customers";
import CalendarPage from "./pages/CalendarPage";
import OKRs from "./pages/OKRs";
import Team from "./pages/Team";
import Leave from "./pages/Leave";
import Meetings from "./pages/Meetings";
import OnsiteWorkPage from "./pages/OnsiteWork";
import Budget from "./pages/Budget";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Import from "./pages/Import";
import Export from "./pages/Export";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import WaitingApproval from "./pages/WaitingApproval";
import AdminPanel from "./pages/AdminPanel";
import KpiOverview from "./pages/kpi/KpiOverview";
import KpiEvaluate from "./pages/kpi/KpiEvaluate";
import KpiReport from "./pages/kpi/KpiReport";
import KpiAdmin from "./pages/kpi/KpiAdmin";
import KpiDashboard from "./pages/kpi/KpiDashboard";
import KpiPeriodSummary from "./pages/kpi/KpiPeriodSummary";
import Wiki from "./pages/Wiki";
import WikiArticle from "./pages/WikiArticle";
import Workload from "./pages/Workload";
import Organization from "./pages/Organization";
import NotFound from "./pages/NotFound";
import MyWork from "./pages/MyWork";
import ManagerDashboard from "./pages/ManagerDashboard";
import ErrorBoundary from "@/components/ErrorBoundary";

// staleTime prevents refetchOnWindowFocus from hitting the network when the
// user quickly switches tabs — data fetched within the last 5 minutes is
// treated as fresh and skipped. After 5 minutes the next focus/mount will
// still trigger a background refresh, so users never see permanently stale data.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — fresh window; no refetch on tab switch
      retry: 1,                  // one retry on failure is enough; avoid hammering the server
    },
  },
});

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FlowingRibbons />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/waiting-approval" element={<WaitingApproval />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/okrs" element={<OKRs />} />
                <Route path="/team" element={<Team />} />
                <Route path="/leave" element={<Leave />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/onsite-work" element={<OnsiteWorkPage />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/import" element={<Import />} />
                <Route path="/export" element={<Export />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/kpi/overview" element={<KpiOverview />} />
                <Route path="/kpi/evaluate/:evaluateeId/:periodId" element={<KpiEvaluate />} />
                <Route path="/kpi/report/:memberId" element={<KpiReport />} />
                <Route path="/kpi/admin" element={<KpiAdmin />} />
                <Route path="/kpi/admin/new-period" element={<KpiAdmin />} />
                <Route path="/kpi/admin/summary/:periodId" element={<KpiPeriodSummary />} />
                <Route path="/kpi/dashboard" element={<KpiDashboard />} />
                <Route path="/wiki" element={<Wiki />} />
                <Route path="/wiki/:slug" element={<WikiArticle />} />
                <Route path="/workload" element={<Workload />} />
                <Route path="/organization" element={<Organization />} />
                <Route path="/my-work" element={<MyWork />} />
                <Route path="/manager" element={<ManagerDashboard />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
