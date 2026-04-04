import { useEffect, useState } from 'react';
import api from '../lib/axios';

function LeavePage() {
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
      case 'denied':
        return 'var(--danger)';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div className="space-y-6" data-testid="leave-page">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          My Leave Requests
        </h2>
        <button
          onClick={() => (window.location.href = '/leave/request')}
          className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          style={{ background: 'var(--orange)' }}
          data-testid="new-request-button"
        >
          New Request
        </button>
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
                  <td className="py-3 px-4">{req.start_date}</td>
                  <td className="py-3 px-4">{req.end_date}</td>
                  <td className="py-3 px-4">{req.days}</td>
                  <td className="py-3 px-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium capitalize text-white"
                      style={{ background: getStatusColor(req.status) }}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{new Date(req.requested_at).toLocaleDateString()}</td>
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
