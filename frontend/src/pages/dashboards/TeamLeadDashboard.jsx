import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';
import { CheckCircle, XCircle, AlertTriangle, Users, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorDetail } from '../../utils/formatError';

function TeamLeadDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [requests, setRequests] = useState([]);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!user?.team_id) return;

      const [requestsRes, queueRes, analyticsRes, workloadRes] = await Promise.all([
        api.get(`/teams/${user.team_id}/requests`),
        api.get(`/teams/${user.team_id}/queue`),
        api.get(`/teams/${user.team_id}/analytics`),
        api.get(`/teams/${user.team_id}/workload`),
      ]);

      setRequests(requestsRes.data);
      setQueue(queueRes.data);
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const onLeaveToday = requestsRes.data.filter(r => 
        r.status === 'approved' && r.start_date <= today && r.end_date >= today
      ).length;

      setStats({
        workload: workloadRes.data.workload_current || 0,
        members_count: analyticsRes.data.team_size || 0,
        on_leave_today: onLeaveToday,
        pending_requests: requestsRes.data.filter(r => r.status === 'pending' || r.status === 'queued').length,
      });
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.patch(`/leave-requests/${requestId}/approve`);
      toast.success('Leave request approved');
      fetchData();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail) || 'Failed to approve');
    }
  };

  const handleDeny = async (requestId) => {
    try {
      const reason = prompt('Enter reason for denial (optional):');
      await api.patch(`/leave-requests/${requestId}/deny`, { reason });
      toast.success('Leave request denied');
      fetchData();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail) || 'Failed to deny');
    }
  };

  const handleOverride = async () => {
    if (!overrideModal || !overrideReason.trim()) {
      toast.error('Please provide a reason for override');
      return;
    }

    try {
      await api.patch(`/leave-requests/${overrideModal.id}/override`, {
        decision: overrideModal.decision,
        reason: overrideReason,
      });
      toast.success(`Override applied: ${overrideModal.decision}`);
      setOverrideModal(null);
      setOverrideReason('');
      fetchData();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail) || 'Failed to override');
    }
  };

  const getSystemRecommendation = (req) => {
    if (stats && stats.workload < 50) return 'Auto-Approve';
    if (req.status === 'queued') return `Queue #${req.queue_position || '?'}`;
    return 'Review Required';
  };

  return (
    <div className="space-y-6" data-testid="team-lead-dashboard">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Team Workload
            </p>
            <TrendingUp size={18} style={{ color: 'var(--orange)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--orange)' }}>
            {stats?.workload || 0}%
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Members Count
            </p>
            <Users size={18} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {stats?.members_count || 0}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              On Leave Today
            </p>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
            {stats?.on_leave_today || 0}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pending Requests
            </p>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>
            {stats?.pending_requests || 0}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b mb-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-6">
            {['overview', 'requests', 'queue', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-3 font-semibold capitalize transition-all duration-200 relative"
                style={{
                  color: activeTab === tab ? 'var(--orange)' : 'var(--text-secondary)',
                }}
              >
                {tab === 'requests' ? 'Team Requests' : tab}
                {activeTab === tab && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--orange)' }}
                  ></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ background: 'var(--page-bg)' }}>
                <h4 className="font-semibold mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-white transition-colors"
                  >
                    Review {stats?.pending_requests || 0} pending requests
                  </button>
                  <button
                    onClick={() => navigate('/leave/all')}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-white transition-colors"
                  >
                    View all team leaves
                  </button>
                  <button
                    onClick={() => navigate('/calendar')}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-white transition-colors"
                  >
                    Open team calendar
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ background: 'var(--orange-pale)' }}>
                <h4 className="font-semibold mb-2">Team Health</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Workload Status:</span>
                    <span className="font-semibold" style={{ color: stats?.workload > 80 ? 'var(--danger)' : 'var(--success)' }}>
                      {stats?.workload > 80 ? 'High' : stats?.workload > 50 ? 'Moderate' : 'Good'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queue Length:</span>
                    <span className="font-semibold">{queue.length} requests</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Requests Tab */}
        {activeTab === 'requests' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Employee
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Dates
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Days
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Requested
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    System Recommendation
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b hover:bg-orange-50 transition-colors duration-150"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                          style={{ background: 'var(--orange)' }}
                        >
                          {req.first_name?.charAt(0)}{req.last_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{req.first_name} {req.last_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {req.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold">{req.days_count}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-sm">{req.type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{
                          background:
                            getSystemRecommendation(req) === 'Auto-Approve'
                              ? 'var(--success)'
                              : getSystemRecommendation(req).startsWith('Queue')
                              ? 'var(--warning)'
                              : 'var(--orange)',
                        }}
                      >
                        {getSystemRecommendation(req)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="p-2 rounded-lg transition-all duration-200 hover:bg-green-50"
                          style={{ color: 'var(--success)' }}
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleDeny(req.id)}
                          className="p-2 rounded-lg transition-all duration-200 hover:bg-red-50"
                          style={{ color: 'var(--danger)' }}
                          title="Deny"
                        >
                          <XCircle size={20} />
                        </button>
                        <button
                          onClick={() => setOverrideModal({ id: req.id, decision: 'approved', employee: `${req.first_name} ${req.last_name}` })}
                          className="p-2 rounded-lg transition-all duration-200 hover:bg-amber-50"
                          style={{ color: 'var(--warning)' }}
                          title="Override"
                        >
                          <AlertTriangle size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <p className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                No pending requests
              </p>
            )}
          </div>
        )}

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ background: 'var(--orange-pale)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Queue moves based on workload capacity and priority factors. Requests are processed in FIFO order when workload permits.
              </p>
            </div>

            {queue.map((req, idx) => (
              <div
                key={req.id}
                className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-md transition-all duration-200"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: 'var(--orange)' }}
                >
                  {req.queue_position || idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{req.first_name} {req.last_name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({req.days_count} days)
                  </p>
                </div>
                <div className="w-32">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        background: 'var(--orange)',
                        width: `${Math.max(10, 100 - (req.queue_position || idx + 1) * 15)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-center mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Priority: {req.priority_score || 0}
                  </p>
                </div>
              </div>
            ))}

            {queue.length === 0 && (
              <p className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                Queue is empty
              </p>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
            <p style={{ color: 'var(--text-secondary)' }}>
              Team analytics and insights coming soon
            </p>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setOverrideModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle size={32} style={{ color: 'var(--warning)' }} />
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Override Request
              </h3>
            </div>

            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              You are about to override the system recommendation for {overrideModal.employee}'s leave request.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Decision
              </label>
              <select
                value={overrideModal.decision}
                onChange={(e) => setOverrideModal({ ...overrideModal, decision: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
              >
                <option value="approved">Approve</option>
                <option value="denied">Deny</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Reason (Required) *
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
                placeholder="Explain why you're overriding the system recommendation..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOverrideModal(null)}
                className="flex-1 py-3 rounded-lg font-semibold border-2 transition-all duration-200 hover:-translate-y-0.5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={!overrideReason.trim()}
                className="flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--warning)' }}
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamLeadDashboard;
