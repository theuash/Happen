import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';

function LeavePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/me/leave-requests');
      setRequests(res.data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'var(--success)';
      case 'pending':
        return 'var(--warning)';
      case 'queued':
        return 'var(--orange)';
      case 'denied':
        return 'var(--danger)';
      case 'emergency':
        return '#DC2626';
      default:
        return 'var(--text-secondary)';
    }
  };

  const canViewAllLeaves = ['team_lead', 'manager', 'hr', 'admin'].includes(user?.role);

  return (
    <div className="space-y-6" data-testid="leave-page">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          My Leave Requests
        </h2>
        <div className="flex gap-3">
          {canViewAllLeaves && (
            <button
              onClick={() => navigate('/leave/all')}
              className="px-4 py-2 rounded-lg font-medium border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
            >
              View All Leaves
            </button>
          )}
          <button
            onClick={() => navigate('/leave/request')}
            className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            style={{ background: 'var(--orange)' }}
            data-testid="new-request-button"
          >
            New Request
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Type
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Start Date
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  End Date
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Days
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Requested
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-orange-50 transition-colors duration-150" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 px-4">
                    <span className="capitalize font-medium">{req.type}</span>
                  </td>
                  <td className="py-3 px-4">{new Date(req.start_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{new Date(req.end_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{req.days_count}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium capitalize text-white"
                      style={{ background: getStatusColor(req.status) }}
                    >
                      {req.status}
                      {req.status === 'queued' && req.queue_position && ` #${req.queue_position}`}
                    </span>
                  </td>
                  <td className="py-3 px-4">{new Date(req.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No leave requests yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeavePage;
