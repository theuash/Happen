import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Clock, CheckCircle, Users, Info, Zap, Timer } from 'lucide-react';

function LeavesQueuePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [queue, setQueue] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [cooldownMins, setCooldownMins] = useState(null); // null = no cooldown
  const [countdown, setCountdown] = useState(null);

  const isManagerOrHR = ['manager', 'hr'].includes(user?.role);
  const isEmployee = !isManagerOrHR;

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const [queueRes, posRes] = await Promise.all([
        api.get('/leave-requests/queue'),
        isEmployee ? api.get('/me/queue-position') : Promise.resolve({ data: null }),
      ]);
      setQueue(queueRes.data);
      if (posRes.data) setMyPosition(posRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isEmployee]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Countdown ticker
  useEffect(() => {
    if (!countdown) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setCooldownMins(null); return null; }
        return prev - 1;
      });
    }, 60000); // tick every minute
    return () => clearInterval(interval);
  }, [countdown]);

  const handleGrantNext = async () => {
    setGranting(true);
    try {
      const res = await api.post('/leave-requests/grant-next');
      toast.success(res.data.message);
      fetchQueue();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429) {
        setCooldownMins(data.remaining_minutes);
        setCountdown(data.remaining_minutes);
        toast.error(`Cooldown: ${data.remaining_minutes} min remaining`);
      } else if (err.response?.status === 404) {
        toast.info('Queue is empty — nothing to grant.');
      } else {
        toast.error(data?.error || 'Failed to grant leave');
      }
    } finally {
      setGranting(false);
    }
  };

  const getTypeColor = (type) => ({
    annual: 'var(--orange)', sick: 'var(--success)',
    wellness: '#8B5CF6', emergency: '#DC2626',
  }[type] || 'var(--text-secondary)');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Leave Queue</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Requests waiting for approval — first in, first out
          </p>
        </div>
        {isEmployee && (
          <button
            onClick={() => navigate('/leave/request')}
            className="px-4 py-2 rounded-lg font-medium text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--orange)' }}
          >
            + New Request
          </button>
        )}
      </div>

      {/* Grant Next — Manager / HR only */}
      {isManagerOrHR && (
        <div
          className="card border-2"
          style={{ borderColor: cooldownMins ? 'var(--border)' : 'var(--orange)' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: cooldownMins ? '#F3F4F6' : 'var(--orange-pale)' }}
              >
                <Zap size={24} style={{ color: cooldownMins ? 'var(--text-secondary)' : 'var(--orange)' }} />
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Grant Next Leave
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Approves the top person in the queue. Can be used once every <strong>4 hours</strong>.
                </p>
                {cooldownMins && (
                  <div className="flex items-center gap-2 mt-2">
                    <Timer size={14} style={{ color: 'var(--warning)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
                      Available again in {countdown ?? cooldownMins} minute{(countdown ?? cooldownMins) !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleGrantNext}
              disabled={granting || !!cooldownMins || queue.length === 0}
              className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: cooldownMins ? '#9CA3AF' : 'var(--orange)' }}
            >
              <Zap size={18} />
              {granting ? 'Granting…' : queue.length === 0 ? 'Queue Empty' : `Grant Leave to #1`}
            </button>
          </div>

          {/* Preview of who's #1 */}
          {queue.length > 0 && !cooldownMins && (
            <div
              className="mt-4 p-3 rounded-lg flex items-center gap-3"
              style={{ background: 'var(--orange-pale)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--orange)' }}
              >
                {queue[0].first_name?.charAt(0)}{queue[0].last_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <span className="font-semibold">{queue[0].first_name} {queue[0].last_name}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>
                  {queue[0].start_date} → {queue[0].end_date} · {queue[0].days_count} day{queue[0].days_count !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ background: 'var(--orange)' }}>
                #1 in queue
              </span>
            </div>
          )}
        </div>
      )}

      {/* My position banner — employees only */}
      {isEmployee && (
        myPosition?.position ? (
          <div className="card border-l-4 flex items-center justify-between" style={{ borderLeftColor: 'var(--orange)', background: 'var(--orange-pale)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ background: 'var(--orange)' }}>
                #{myPosition.position}
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>You're #{myPosition.position} in the queue</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Est. approval: <span className="font-semibold">{new Date(myPosition.estimated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/leave')} className="px-4 py-2 rounded-lg font-medium border-2 transition-all hover:-translate-y-0.5" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}>
              My Requests
            </button>
          </div>
        ) : (
          <div className="card flex items-center gap-3" style={{ background: '#F0FDF4', borderLeft: '4px solid var(--success)' }}>
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            <p className="font-medium" style={{ color: 'var(--success)' }}>You have no pending requests in the queue.</p>
          </div>
        )
      )}

      {/* Info note */}
      <div className="card flex items-start gap-3" style={{ background: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}>
        <Info size={18} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
        <p className="text-sm" style={{ color: '#1E40AF' }}>
          Queue is FIFO — first submitted, first approved. When workload drops below 50% requests auto-approve. Emergency leaves bypass the queue entirely.
        </p>
      </div>

      {/* Queue list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>All Queued Requests</h3>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Users size={16} />
            <span>{queue.length} request{queue.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Queue is empty</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>All requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((req, idx) => {
              const isMe = req.user_id?.toString() === user?._id?.toString();
              const isTop = idx === 0;
              return (
                <div
                  key={req.id || idx}
                  className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md"
                  style={{
                    borderColor: isTop ? 'var(--orange)' : isMe ? '#8B5CF6' : 'var(--border)',
                    background: isTop ? 'var(--orange-pale)' : isMe ? '#F5F3FF' : 'white',
                  }}
                >
                  {/* Position */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                    style={{
                      background: isTop ? 'var(--orange)' : 'var(--page-bg)',
                      color: isTop ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {req.queue_position || idx + 1}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ background: isTop ? 'var(--orange-dark)' : '#6B7280' }}
                  >
                    {req.first_name?.charAt(0)}{req.last_name?.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {req.first_name} {req.last_name}
                      </span>
                      {isMe && <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: '#8B5CF6' }}>You</span>}
                      {isTop && <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: 'var(--orange)' }}>Next up</span>}
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white capitalize" style={{ background: getTypeColor(req.type) }}>
                        {req.type}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {req.start_date && new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {req.end_date && ` – ${new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      {req.days_count && <span className="mx-2">·</span>}
                      {req.days_count} day{req.days_count !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Submitted date */}
                  <div className="text-right text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    <p>Submitted</p>
                    <p className="font-medium">
                      {new Date(req.createdAt || req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-20 flex-shrink-0">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          background: isTop ? 'var(--orange)' : 'var(--border)',
                          width: `${Math.max(8, 100 - (req.queue_position || idx + 1) * 10)}%`,
                        }}
                      />
                    </div>
                  </div>
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
