import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { Users, Lock, FileText, UserCheck } from 'lucide-react';

function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="card hover:-translate-y-1 transition-all duration-200 text-left"
        >
          <Users size={32} style={{ color: 'var(--orange)' }} className="mb-3" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            User Management
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {users.length} total users
          </p>
        </button>

        <button
          onClick={() => navigate('/admin/passwords')}
          className="card hover:-translate-y-1 transition-all duration-200 text-left"
        >
          <Lock size={32} style={{ color: 'var(--danger)' }} className="mb-3" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Password Vault
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage credentials
          </p>
        </button>

        <button
          onClick={() => navigate('/admin/audit')}
          className="card hover:-translate-y-1 transition-all duration-200 text-left"
        >
          <FileText size={32} style={{ color: 'var(--warning)' }} className="mb-3" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Audit Logs
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            View system activity
          </p>
        </button>

        <button
          onClick={() => navigate('/admin/impersonate')}
          className="card hover:-translate-y-1 transition-all duration-200 text-left"
        >
          <UserCheck size={32} style={{ color: 'var(--success)' }} className="mb-3" />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Impersonate User
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Login as any user
          </p>
        </button>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent Users
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Name
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Role
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Department
                </th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map((user) => (
                <tr key={user._id} className="border-b hover:bg-orange-50 transition-colors duration-150" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 px-4 font-medium">{user.name}</td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">{user.department || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
