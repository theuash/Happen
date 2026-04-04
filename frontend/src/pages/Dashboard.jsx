import EmployeeDashboard from './dashboards/EmployeeDashboard';
import TeamLeadDashboard from './dashboards/TeamLeadDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import HRDashboard from './dashboards/HRDashboard';
import AccountingDashboard from './dashboards/AccountingDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { useAuthStore } from '../store/authStore';

const DASHBOARD_MAP = {
  employee: EmployeeDashboard,
  team_lead: TeamLeadDashboard,
  manager: ManagerDashboard,
  hr: HRDashboard,
  accounting: AccountingDashboard,
  admin: AdminDashboard,
};

function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const DashboardComponent = DASHBOARD_MAP[user?.role] || EmployeeDashboard;

  return (
    <div data-testid="dashboard-container">
      <DashboardComponent />
    </div>
  );
}

export default Dashboard;
