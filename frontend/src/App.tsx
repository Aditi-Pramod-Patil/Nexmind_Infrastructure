import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import { EmployerLayout } from './layouts/EmployerLayout';
import { WorkerLayout } from './layouts/WorkerLayout';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';

// Employer Pages
import { OverviewDashboard } from './pages/employer/OverviewDashboard';
import { ProjectsListPage } from './pages/employer/ProjectsListPage';
import { ProjectDetailPage } from './pages/employer/ProjectDetailPage';
import { PlanReviewPage } from './pages/employer/PlanReviewPage';
import { ScheduleExplorerPage } from './pages/employer/ScheduleExplorerPage';
import { L5L6ActivitiesPage } from './pages/employer/L5L6ActivitiesPage';
import { ActivityDetailPage } from './pages/employer/ActivityDetailPage';
import { SiteImagesAIPage } from './pages/employer/SiteImagesAIPage';
import { AIInsightsPage } from './pages/employer/AIInsightsPage';
import { RiskDelaysPage } from './pages/employer/RiskDelaysPage';
import { ReportsPage } from './pages/employer/ReportsPage';
import { ProjectHistoryPage } from './pages/employer/ProjectHistoryPage';
import { EmployerSettingsPage } from './pages/employer/EmployerSettingsPage';

// Worker Pages
import { WorkerDashboard } from './pages/worker/WorkerDashboard';
import { WorkerProjectDetailPage } from './pages/worker/WorkerProjectDetailPage';
import { WorkerActivitiesPage } from './pages/worker/WorkerActivitiesPage';
import { WorkerReportProgressPage } from './pages/worker/WorkerReportProgressPage';
import { WorkerHistoryPage } from './pages/worker/WorkerHistoryPage';

function ProtectedRoute({ children, allowedRole }: { children: JSX.Element; allowedRole?: 'employer' | 'worker' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans text-xs text-slate-500 font-bold space-y-2">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div>Authenticating session & database context...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Treat 'supervisor' and 'worker' as worker-level application interface roles
  const isWorkerRole = (user.role as string) === 'worker' || (user.role as string) === 'supervisor';
  const isEmployerRole = (user.role as string) === 'employer';

  if (allowedRole === 'employer' && !isEmployerRole) {
    return <Navigate to="/worker/dashboard" replace />;
  }

  if (allowedRole === 'worker' && !isWorkerRole) {
    return <Navigate to="/employer/dashboard" replace />;
  }

  return children;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Employer Protected Routes */}
          <Route
            path="/employer"
            element={
              <ProtectedRoute allowedRole="employer">
                <EmployerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OverviewDashboard />} />
            <Route path="projects" element={<ProjectsListPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:id/plan" element={<PlanReviewPage />} />
            <Route path="projects/:id/execution-plan" element={<PlanReviewPage />} />
            <Route path="schedule" element={<ScheduleExplorerPage />} />
            <Route path="activities" element={<L5L6ActivitiesPage />} />
            <Route path="activities/:id" element={<ActivityDetailPage />} />
            <Route path="site-images" element={<SiteImagesAIPage />} />
            <Route path="ai-insights" element={<AIInsightsPage />} />
            <Route path="risks" element={<RiskDelaysPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="history" element={<ProjectHistoryPage />} />
            <Route path="settings" element={<EmployerSettingsPage />} />
          </Route>

          {/* Worker Protected Routes */}
          <Route
            path="/worker"
            element={
              <ProtectedRoute allowedRole="worker">
                <WorkerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="projects/:id" element={<WorkerProjectDetailPage />} />
            <Route path="activities" element={<WorkerActivitiesPage />} />
            <Route path="report" element={<WorkerReportProgressPage />} />
            <Route path="history" element={<WorkerHistoryPage />} />
          </Route>

          {/* Catch All Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
