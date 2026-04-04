import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

function TeamLeadDashboard() {
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsRes, analyticsRes] = await Promise.all([
        api.get(`/teams/${user.team_id}/requests`),
        api.get(`/teams/${user.team_id}/analytics`),
      ]);
      setRequests(requestsRes.data);
      setStats(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.patch(`/leave-requests/${requestId}/approve`);
      fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleDeny = async (requestId) => {
    try {
      await api.patch(`/leave-requests/${requestId}/deny`);
      fetchData();
    } catch (error) {
      console.error('Error denying request:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="team-lead-dashboard">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Team Workload
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--orange)' }}>
              {stats.workload}%
            </p>
          </div>
          <div className="card">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Pending Requests
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--warning)' }}>
              {stats.pending_requests}
            </p>
          </div>
          <div className="card">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Team Members
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
              {stats.members_count}
            </p>
          </div>
          <div className="card">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              On Leave Today
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--success)' }}>
              {stats.on_leave_today}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b mb-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-4">
            {['requests', 'queue', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-3 font-medium capitalize transition-colors duration-150"
                style={{
                  color: activeTab === tab ? 'var(--orange)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab ? '2px solid var(--orange)' : 'none',
                }}
                data-testid={`tab-${tab}`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Leave Requests Tab */}
        {activeTab === 'requests' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Employee
                  </th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Dates
                  </th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Days
                  </th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    System Rec
                  </th>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b hover:bg-orange-50 transition-colors duration-150" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ background: 'var(--orange)' }}
                        >
                          {req.employee.avatar}
                        </div>
                        <span className="font-medium">{req.employee.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {req.start_date} - {req.end_date}
                    </td>
                    <td className="py-3 px-4">{req.days}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize">{req.type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          background:
                            req.system_recommendation === 'Auto-Approve'
                              ? 'var(--success)'
                              : req.system_recommendation.startsWith('Queue')
                              ? 'var(--warning)'
                              : 'var(--danger)',
                          color: 'white',
                        }}
                      >
                        {req.system_recommendation}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="p-2 rounded-lg hover:bg-green-50 transition-colors duration-150"
                          title="Approve"
                          data-testid={`approve-${req.id}`}
                        >
                          <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                        </button>
                        <button
                          onClick={() => handleDeny(req.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors duration-150"
                          title="Deny"
                          data-testid={`deny-${req.id}`}
                        >
                          <XCircle size={18} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                No pending requests
              </p>
            )}
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="space-y-3">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Queue moves based on workload and priority factors
            </p>
            {[1, 2, 3].map((pos) => (
              <div key={pos} className="flex items-center gap-4 p-4 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: 'var(--orange)' }}
                >
                  {pos}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Employee {pos}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Feb {10 + pos * 2}-{12 + pos * 2}
                  </p>
                </div>
                <div className="w-32">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ background: 'var(--orange)', width: `${85 - pos * 5}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <p style={{ color: 'var(--text-secondary)' }}>Team analytics and insights will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamLeadDashboard;
