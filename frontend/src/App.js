import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import ToastProvider from './components/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import LeavePage from './pages/LeavePage';
import LeaveRequestPage from './pages/LeaveRequestPage';
import AllLeavesPage from './pages/AllLeavesPage';
import LeavesQueuePage from './pages/LeavesQueuePage';
import TeamPage from './pages/TeamPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HRPage from './pages/HRPage';
import PayrollPage from './pages/PayrollPage';
import DonationPage from './pages/DonationPage';
import WellnessPage from './pages/WellnessPage';
import SettingsPage from './pages/SettingsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPasswordsPage from './pages/admin/AdminPasswordsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminImpersonatePage from './pages/admin/AdminImpersonatePage';
import { useAuthStore } from './store/authStore';

function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
            
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/leave/request" element={<LeaveRequestPage />} />
              <Route path="/leave/queue" element={<LeavesQueuePage />} />
              <Route path="/leave/all" element={<ProtectedRoute allowedRoles={['team_lead', 'manager', 'hr', 'admin']}><AllLeavesPage /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute allowedRoles={['team_lead', 'manager']}><TeamPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute allowedRoles={['manager', 'hr', 'accounting']}><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/hr" element={<ProtectedRoute allowedRoles={['hr']}><HRPage /></ProtectedRoute>} />
              <Route path="/payroll" element={<ProtectedRoute allowedRoles={['accounting']}><PayrollPage /></ProtectedRoute>} />
              <Route path="/donation" element={<DonationPage />} />
              <Route path="/wellness" element={<WellnessPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
              <Route path="/admin/passwords" element={<ProtectedRoute allowedRoles={['admin']}><AdminPasswordsPage /></ProtectedRoute>} />
              <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['admin']}><AdminAuditPage /></ProtectedRoute>} />
              <Route path="/admin/impersonate" element={<ProtectedRoute allowedRoles={['admin']}><AdminImpersonatePage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
