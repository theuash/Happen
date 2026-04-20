import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { Users, Activity, Clock, AlertTriangle, Shield, Key, FileText, UserCog } from 'lucide-react';

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [systemAlerts, setSystemAlerts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Mock data for demo
      setStats({
        total_users: 156,
        active_today: 142,
        pending_leaves: 23,
        system_alerts: 2,
      });

      setSystemAlerts([
        { id: 1, type: 'warning', message: 'Database backup pending', time: '2 hours ago' },
        { id: 2, type: 'info', message: '3 new users registered', time: '5 hours ago' },
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  const quickLinks = [
    { icon: Users, label: 'User Management', path: '/admin/users', color: 'var(--orange)' },
    { icon: Key, label: 'Password Vault', path: '/admin/passwords', color: '#DC2626' },
    { icon: FileText, label: 'Audit Logs', path: '/admin/audit', color: 'var(--success)' },
    { icon: UserCog, label: 'Impersonate User', path: '/admin/impersonate', color: 'var(--warning)' },
  ];

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Users
            </p>
            <Users size={18} style={{ color: 'var(--orange)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--orange)' }}>
            {stats?.total_users || 0}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Across all teams
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Active Today
            </p>
            <Activity size={18} style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
            {stats?.active_today || 0}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {stats && Math.round((stats.active_today / stats.total_users) * 100)}% of total
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pending Leaves
            </p>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>
            {stats?.pending_leaves || 0}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Awaiting approval
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              System Alerts
            </p>
            <AlertTriangle size={18} style={{ color: '#DC2626' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: '#DC2626' }}>
            {stats?.system_alerts || 0}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Requires attention
          </p>
        </div>
      </div>

      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            System Alerts
          </h3>
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-4 p-4 rounded-lg border-l-4"
                style={{
                  borderLeftColor: alert.type === 'warning' ? '#F59E0B' : 'var(--orange)',
                  background: alert.type === 'warning' ? '#FFF7ED' : 'var(--orange-pale)',
                }}
              >
                <AlertTriangle
                  size={24}
                  style={{ color: alert.type === 'warning' ? '#F59E0B' : 'var(--orange)' }}
                />
                <div className="flex-1">
                  <p className="font-medium">{alert.message}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {alert.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Quick Links to Admin Sections
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={() => navigate(link.path)}
              className="p-6 rounded-lg border-2 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 text-left"
              style={{ borderColor: 'var(--border)' }}
            >
              <link.icon size={32} style={{ color: link.color }} className="mb-3" />
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {link.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent System Activity
        </h3>
        <div className="space-y-3">
          {[
            { action: 'User created', user: 'admin@happen.com', details: 'Created new user: john.doe@company.com', time: '10 minutes ago' },
            { action: 'Password reset', user: 'admin@happen.com', details: 'Reset password for sarah.chen@company.com', time: '1 hour ago' },
            { action: 'Audit log viewed', user: 'admin@happen.com', details: 'Viewed audit logs for March 2026', time: '2 hours ago' },
            { action: 'User impersonated', user: 'admin@happen.com', details: 'Impersonated james.wu@company.com', time: '3 hours ago' },
          ].map((activity, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-lg hover:bg-orange-50 transition-colors"
              style={{ background: 'var(--page-bg)' }}
            >
              <div className="relative">
                <div
                  className="w-3 h-3 rounded-full mt-1"
                  style={{ background: 'var(--orange)' }}
                ></div>
                {idx < 3 && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-4 w-0.5 h-16"
                    style={{ background: 'var(--border)' }}
                  ></div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {activity.action}
                  </p>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {activity.time}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {activity.details}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  By: {activity.user}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={24} style={{ color: 'var(--success)' }} />
            <h4 className="font-semibold">Security Status</h4>
          </div>
          <p className="text-2xl font-bold mb-2" style={{ color: 'var(--success)' }}>
            Healthy
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            All security checks passed
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <Activity size={24} style={{ color: 'var(--success)' }} />
            <h4 className="font-semibold">System Performance</h4>
          </div>
          <p className="text-2xl font-bold mb-2" style={{ color: 'var(--success)' }}>
            98.5%
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Uptime this month
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <FileText size={24} style={{ color: 'var(--orange)' }} />
            <h4 className="font-semibold">Database</h4>
          </div>
          <p className="text-2xl font-bold mb-2" style={{ color: 'var(--orange)' }}>
            2.4 GB
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Last backup: 6 hours ago
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
