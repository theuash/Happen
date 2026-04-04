import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  BarChart2,
  Shield,
  DollarSign,
  Gift,
  Heart,
  Settings,
  Lock,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import api from '../lib/axios';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['all'] },
  { icon: Calendar, label: 'Calendar', path: '/calendar', roles: ['all'] },
  { icon: ClipboardList, label: 'Leave Requests', path: '/leave', roles: ['all'] },
  { icon: Users, label: 'My Team', path: '/team', roles: ['team_lead', 'manager'] },
  { icon: BarChart2, label: 'Analytics', path: '/analytics', roles: ['manager', 'hr', 'accounting'] },
  { icon: Shield, label: 'HR Portal', path: '/hr', roles: ['hr'] },
  { icon: DollarSign, label: 'Payroll', path: '/payroll', roles: ['accounting'] },
  { icon: Gift, label: 'Leave Donation', path: '/donation', roles: ['all'] },
  { icon: Heart, label: 'Wellness Days', path: '/wellness', roles: ['all'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['all'] },
  { icon: Lock, label: 'Admin Panel', path: '/admin', roles: ['admin'] },
];

function Sidebar({ collapsed, onToggleCollapse }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    }
    logout();
    navigate('/login');
  };

  const filteredNav = NAV.filter(
    (item) => item.roles.includes('all') || item.roles.includes(user?.role)
  );

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className="flex flex-col transition-all duration-300 ease-in-out h-screen"
      style={{
        width: collapsed ? '72px' : '260px',
        background: 'var(--sidebar-bg)',
        position: 'relative',
      }}
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'var(--orange)' }}
            >
              H
            </div>
            <span className="text-white text-xl font-semibold">Happen</span>
          </div>
        )}
        {collapsed && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto"
            style={{ background: 'var(--orange)' }}
          >
            H
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-white border-2 border-gray-700 flex items-center justify-center hover:bg-orange-50 transition-colors duration-200"
        style={{ zIndex: 10 }}
        data-testid="sidebar-collapse-toggle"
      >
        <ChevronLeft
          size={16}
          style={{ color: 'var(--orange)', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
        />
      </button>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 transition-all duration-150 hover:bg-gray-800 hover:text-white ${
                isActive ? 'border-l-4' : ''
              }`
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'var(--orange-pale)',
                    color: 'var(--orange)',
                    borderLeftColor: 'var(--orange)',
                  }
                : {}
            }
            data-testid={`nav-${item.path.replace(/\//g, '-')}`}
          >
            <item.icon size={20} />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
            style={{ background: 'var(--orange)' }}
          >
            {getInitials(user?.name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.name}</div>
              <div
                className="text-xs px-2 py-0.5 rounded inline-block mt-1"
                style={{ background: 'var(--orange-dark)', color: 'white' }}
              >
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            title="Logout"
            data-testid="logout-button"
          >
            <LogOut size={18} className="text-gray-300 hover:text-white" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
