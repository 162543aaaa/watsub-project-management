import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
