import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Clock, CheckCircle, XCircle, AlertCircle, Users, Info } from 'lucide-react';
import { formatApiErrorDetail } from '../utils/formatError';

function LeavesQueuePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [queue, setQueue] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManage = ['team_lead', 'manager', 'hr', 'admin'].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const promises = [api.get('/me/queue-position')];
      if (user?.team_id) promises.push(api.get(`/teams/${user.team_id}/queue`));

      const [myPosRes, teamQueueRes] = await Promise.all(promises);
      setMyPosition(myPosRes.data);
      setQueue(teamQueueRes?.data || []);
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/leave-requests/${id}/approve`);
      toast.success('Leave approved');
      fetchData();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail) || 'Failed to approve');
    }
  };

  const handleDeny = async (id) => {
    const reason = prompt('Reason for denial (optional):');
    if (reason === null) return;
    try {
      await api.patch(`/leave-requests/${id}/deny`, { reason });
      toast.success('Leave denied');
      fetchData();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail) || 'Failed to deny');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'annual':   return 'var(--orange)';
      case 'sick':     return 'var(--success)';
      case 'wellness': return '#8B5CF6';
      case 'emergency':return '#DC2626';
      default:         return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leaves-queue-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Leave Queue
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Requests waiting for approval, ordered by submission time
          </p>
        </div>
        <button
          onClick={() => navigate('/leave/request')}
          className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          style={{ background: 'var(--orange)' }}
        >
          + New Request
        </button>
      </div>

      {/* My Queue Position Banner */}
      {myPosition?.position ? (
        <div
          className="card border-l-4 flex items-center justify-between"
          style={{ borderLeftColor: 'var(--orange)', background: 'var(--orange-pale)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'var(--orange)' }}
            >
              #{myPosition.position}
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                You're #{myPosition.position} in the queue
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Estimated approval:{' '}
                <span className="font-semibold">
                  {new Date(myPosition.estimated_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/leave')}
            className="px-4 py-2 rounded-lg font-medium border-2 transition-all duration-200 hover:-translate-y-0.5"
            style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
          >
            My Requests
          </button>
        </div>
      ) : (
        <div
          className="card flex items-center gap-3"
          style={{ background: '#F0FDF4', borderLeft: '4px solid var(--success)' }}
        >
          <CheckCircle size={24} style={{ color: 'var(--success)' }} />
          <p className="font-medium" style={{ color: 'var(--success)' }}>
            You have no pending requests in the queue.
          </p>
        </div>
      )}

      {/* Priority Algorithm Info */}
      <div
        className="card flex items-start gap-3"
        style={{ background: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}
      >
        <Info size={20} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
        <p className="text-sm" style={{ color: '#1E40AF' }}>
          Queue position is determined by submission time (FIFO). Requests move up automatically
          when team workload drops below 50%. Emergency leaves bypass the queue entirely.
        </p>
      </div>

      {/* Queue Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Team Queue
          </h3>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Users size={16} />
            <span>{queue.length} request{queue.length !== 1 ? 's' : ''} in queue</span>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              Queue is empty
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              All requests have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((req, idx) => {
              const isMe = req.user_id === user?.id;
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md"
                  style={{
                    borderColor: isMe ? 'var(--orange)' : 'var(--border)',
                    background: isMe ? 'var(--orange-pale)' : 'white',
                  }}
                >
                  {/* Position Badge */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                    style={{
                      background: isMe ? 'var(--orange)' : 'var(--page-bg)',
                      color: isMe ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {req.queue_position || idx + 1}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ background: isMe ? 'var(--orange-dark)' : '#6B7280' }}
                  >
                    {req.first_name?.charAt(0)}{req.last_name?.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {req.first_name} {req.last_name}
                        {isMe && (
                          <span
                            className="ml-2 px-2 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ background: 'var(--orange)' }}
                          >
                            You
                          </span>
                        )}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold text-white capitalize"
                        style={{ background: getTypeColor(req.type) }}
                      >
                        {req.type}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="mx-2">·</span>
                      {req.days_count} day{req.days_count !== 1 ? 's' : ''}
                    </p>
                    {req.reason && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {req.reason}
                      </p>
                    )}
                  </div>

                  {/* Submitted */}
                  <div className="text-right text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    <p>Submitted</p>
                    <p className="font-medium">
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-24 flex-shrink-0">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          background: 'var(--orange)',
                          width: `${Math.max(8, 100 - (req.queue_position || idx + 1) * 12)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-center mt-1" style={{ color: 'var(--text-secondary)' }}>
                      priority
                    </p>
                  </div>

                  {/* Actions for managers */}
                  {canManage && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                        title="Approve"
                        style={{ color: 'var(--success)' }}
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => handleDeny(req.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Deny"
                        style={{ color: 'var(--danger)' }}
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LeavesQueuePage;
