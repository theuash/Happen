import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function AdminImpersonatePage() {
  const [users, setUsers] = useState([]);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.filter((u) => u.role !== 'admin'));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleImpersonate = async (userId, userName) => {
    try {
      const res = await api.post('/admin/impersonate', { user_id: userId });
      login(res.data, res.data.token);
      toast.success(`Now impersonating ${userName}`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message);
    }
  };

  return (
    <div className="card" data-testid="admin-impersonate-page">
      <div className="border-l-4 p-4 mb-6" style={{ borderLeftColor: 'var(--warning)', background: '#FFF7ED' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
          WARNING: Impersonation is logged and visible to HR. Use responsibly.
        </p>
      </div>

      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Impersonate User
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div key={user._id} className="card border" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: 'var(--orange)' }}
              >
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {user.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {user.email}
                </p>
              </div>
            </div>
            <div className="mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>
                {user.role}
              </span>
            </div>
            <button
              onClick={() => handleImpersonate(user._id, user.name)}
              className="w-full py-2 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'var(--orange)' }}
              data-testid={`impersonate-${user._id}`}
            >
              Login as this user
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminImpersonatePage;
