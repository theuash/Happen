import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const pageTitles = {
    '/dashboard': 'Dashboard',
    '/calendar': 'Calendar',
    '/leave': 'My Leave Requests',
    '/leave/request': 'Request Leave',
    '/leave/queue': 'Leave Queue',
    '/leave/all': 'All Leave Requests',
    '/team': 'My Team',
    '/analytics': 'Analytics',
    '/hr': 'HR Portal',
    '/payroll': 'Payroll',
    '/donation': 'Leave Donation',
    '/wellness': 'Wellness Days',
    '/settings': 'Settings',
    '/admin': 'Admin Panel',
    '/admin/users': 'User Management',
    '/admin/passwords': 'Password Vault',
    '/admin/audit': 'Audit Logs',
    '/admin/impersonate': 'Impersonate User',
  };

  const pageTitle = pageTitles[location.pathname] || 'Happen';

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={pageTitle} />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--page-bg)' }}>
          <div className="animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
