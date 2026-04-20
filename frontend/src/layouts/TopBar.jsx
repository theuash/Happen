import { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

function TopBar({ title }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    }
    logout();
    navigate('/login');
  };

  const getInitials = (user) => {
    if (!user) return 'U';
    return `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  return (
    <header
      className="sticky top-0 h-16 bg-white border-b flex items-center justify-between px-6 z-10"
      style={{ borderColor: 'var(--border)' }}
      data-testid="top-bar"
    >
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-lg bg-gray-100 border-0 focus:outline-none focus:ring-2 w-64"
            style={{ focusRingColor: 'var(--orange)' }}
            data-testid="search-input"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150" data-testid="notifications-bell">
          <Bell size={20} style={{ color: 'var(--text-secondary)' }} />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: 'var(--orange)' }}
          ></span>
        </button>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors duration-150"
            data-testid="user-avatar-dropdown"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
              style={{ background: 'var(--orange)' }}
            >
              {getInitials(user)}
            </div>
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 animate-fadeIn"
              style={{ borderColor: 'var(--border)' }}
              data-testid="user-dropdown-menu"
            >
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors duration-150"
                data-testid="profile-menu-item"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  handleLogout();
                }}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 transition-colors duration-150"
                data-testid="logout-menu-item"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
