import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FlowingRibbons from "@/components/FlowingRibbons";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Projects = lazy(() => import("./pages/Projects"));
const Customers = lazy(() => import("./pages/Customers"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const OKRs = lazy(() => import("./pages/OKRs"));
const Team = lazy(() => import("./pages/Team"));
const Leave = lazy(() => import("./pages/Leave"));
const Meetings = lazy(() => import("./pages/Meetings"));
const OnsiteWorkPage = lazy(() => import("./pages/OnsiteWork"));
const Budget = lazy(() => import("./pages/Budget"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const WaitingApproval = lazy(() => import("./pages/WaitingApproval"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const KpiOverview = lazy(() => import("./pages/kpi/KpiOverview"));
const KpiEvaluate = lazy(() => import("./pages/kpi/KpiEvaluate"));
const KpiReport = lazy(() => import("./pages/kpi/KpiReport"));
const KpiAdmin = lazy(() => import("./pages/kpi/KpiAdmin"));
const KpiDashboard = lazy(() => import("./pages/kpi/KpiDashboard"));
const KpiPeriodSummary = lazy(() => import("./pages/kpi/KpiPeriodSummary"));
const Wiki = lazy(() => import("./pages/Wiki"));
const WikiArticle = lazy(() => import("./pages/WikiArticle"));
const Workload = lazy(() => import("./pages/Workload"));
const Organization = lazy(() => import("./pages/Organization"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MyWork = lazy(() => import("./pages/MyWork"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));

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
          <Suspense fallback={<LoadingScreen />}>
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
                <Route path="/import" element={<ImportExport />} />
                <Route path="/export" element={<Navigate to="/import" replace />} />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
