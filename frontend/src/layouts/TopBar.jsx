import { useState, useEffect, useRef } from 'react';
import { Bell, Search, ChevronDown, LogOut, Settings, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

// All demo users grouped by role — matches seed.js exactly
const DEMO_USERS = [
  { role: 'admin',      label: 'Admin',       color: '#7C3AED', users: [
    { name: 'Alex Rivera',    email: 'admin@happen.com',              password: 'Admin2026!',      avatar: 'AR' },
  ]},
  { role: 'manager',    label: 'Manager',     color: '#F59E0B', users: [
    { name: 'Michael Brown',  email: 'michael@creativesolutions.com', password: 'MichaelMgr456!',  avatar: 'MB' },
    { name: 'Olivia Martinez',email: 'olivia@creativesolutions.com',  password: 'OliviaDr789!',    avatar: 'OM' },
    { name: 'Thomas Wright',  email: 'thomas@creativesolutions.com',  password: 'ThomasTD456!',    avatar: 'TW' },
  ]},
  { role: 'hr',         label: 'HR',          color: '#EC4899', users: [
    { name: 'Lisa Wong',      email: 'lisa@creativesolutions.com',    password: 'LisaHR789!',      avatar: 'LW' },
    { name: 'Kevin Park',     email: 'kevin@creativesolutions.com',   password: 'KevinHR123!',     avatar: 'KP' },
  ]},
  { role: 'team_lead',  label: 'Team Lead',   color: '#0EA5E9', users: [
    { name: 'Sarah Chen',     email: 'sarah@creativesolutions.com',   password: 'SarahLead123!',   avatar: 'SC' },
    { name: 'Marcus Taylor',  email: 'marcus@creativesolutions.com',  password: 'MarcusLead456!',  avatar: 'MT' },
    { name: 'Jessica Martinez',email:'jessica@creativesolutions.com', password: 'JessicaLead789!', avatar: 'JM' },
    { name: 'David Kim',      email: 'david.k@creativesolutions.com', password: 'DavidLead123!',   avatar: 'DK' },
  ]},
  { role: 'accounting', label: 'Accounting',  color: '#22C55E', users: [
    { name: 'Robert Chen',    email: 'robert@creativesolutions.com',  password: 'RobertAcct789!',  avatar: 'RC' },
    { name: 'Maria Garcia',   email: 'maria@creativesolutions.com',   password: 'MariaAcct456!',   avatar: 'MG' },
  ]},
  { role: 'employee',   label: 'Employee',    color: '#F4631E', users: [
    { name: 'James Wu',       email: 'james.wu@creativesolutions.com',password: 'JamesWu123!',     avatar: 'JW' },
    { name: 'Diana Prince',   email: 'diana@creativesolutions.com',   password: 'DianaOM123!',     avatar: 'DP' },
    { name: 'Elena Rodriguez',email: 'elena@creativesolutions.com',   password: 'ElenaRod456!',    avatar: 'ER' },
    { name: 'Omar Hassan',    email: 'omar@creativesolutions.com',    password: 'OmarHas789!',     avatar: 'OH' },
    { name: 'Priya Kapoor',   email: 'priya@creativesolutions.com',   password: 'PriyaKap123!',    avatar: 'PK' },
    { name: 'Andre Johnson',  email: 'andre@creativesolutions.com',   password: 'AndreDev789!',    avatar: 'AJ' },
    { name: 'Yuki Tanaka',    email: 'yuki@creativesolutions.com',    password: 'YukiTan123!',     avatar: 'YT' },
    { name: 'Ryan O\'Connor', email: 'ryan@creativesolutions.com',    password: 'RyanOC123!',      avatar: 'RO' },
    { name: 'Sofia Reyes',    email: 'sofia@creativesolutions.com',   password: 'SofiaRey456!',    avatar: 'SR' },
  ]},
];

const ROLE_COLORS = {
  admin: '#7C3AED', manager: '#F59E0B', hr: '#EC4899',
  team_lead: '#0EA5E9', accounting: '#22C55E', employee: '#F4631E',
};

function TopBar({ title }) {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const dropRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSwitchUser = async (demoUser) => {
    setSwitching(true);
    setShowDropdown(false);
    try {
      const { data } = await api.post('/auth/login', {
        email: demoUser.email,
        password: demoUser.password,
      });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (e) {
      console.error('Switch failed', e);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* silent */ }
    logout();
    navigate('/login');
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch { /* silent */ }
  };

  const getInitials = (u) => u
    ? `${u.first_name?.charAt(0) || ''}${u.last_name?.charAt(0) || ''}`.toUpperCase()
    : 'U';

  const roleColor = ROLE_COLORS[user?.role] || 'var(--orange)';

  return (
    <header
      className="sticky top-0 h-16 bg-white border-b flex items-center justify-between px-6 z-40"
      style={{ borderColor: 'var(--border)' }}
    >
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 rounded-lg bg-gray-100 text-sm border-0 focus:outline-none focus:ring-2 w-52"
            style={{ '--tw-ring-color': 'var(--orange)' }}
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} style={{ color: 'var(--text-secondary)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                style={{ background: 'var(--orange)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border overflow-hidden z-50 animate-fadeIn" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs" style={{ color: 'var(--orange)' }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No notifications</p>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    className="px-4 py-3 border-b hover:bg-gray-50 transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      background: n.is_read ? 'white' : 'var(--orange-pale)',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Switcher Dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors"
            disabled={switching}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ background: roleColor }}
            >
              {switching ? '…' : getInitials(user)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs capitalize leading-tight" style={{ color: roleColor }}>
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border overflow-hidden z-50 animate-fadeIn"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Current user header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--page-bg)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: roleColor }}
                  >
                    {getInitials(user)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Switch user section */}
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Users size={13} style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Switch Demo User
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {DEMO_USERS.map(group => (
                    <div key={group.role}>
                      <p
                        className="text-xs font-bold px-2 py-1 rounded uppercase tracking-wide"
                        style={{ color: group.color, background: `${group.color}15` }}
                      >
                        {group.label}
                      </p>
                      {group.users.map(u => {
                        const isCurrent = u.email === user?.email;
                        return (
                          <button
                            key={u.email}
                            onClick={() => !isCurrent && handleSwitchUser(u)}
                            disabled={isCurrent || switching}
                            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all duration-150 disabled:cursor-default"
                            style={{
                              background: isCurrent ? `${group.color}20` : 'transparent',
                            }}
                            onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${group.color}10`; }}
                            onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: group.color }}
                            >
                              {u.avatar}
                            </div>
                            <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-semibold text-white" style={{ background: group.color }}>
                                active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={() => { setShowDropdown(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm text-red-600"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
