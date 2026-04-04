import { useEffect, useState } from 'react';
import api from '../../lib/axios';

function AdminUsersPage() {
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
    <div className="card" data-testid="admin-users-page">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        User Management
      </h2>
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
            {users.map((user) => (
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
  );
}

export default AdminUsersPage;
