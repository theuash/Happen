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
  const [cooldownMins, setCooldownMins] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const canGrant = ['manager', 'hr'].includes(user?.role);
  const showMyPosition = ['employee', 'team_lead', 'accounting'].includes(user?.role);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);

      const calls = [api.get('/queue')];
      if (showMyPosition) calls.push(api.get('/me/queue-position'));

      const results = await Promise.allSettled(calls);

      if (results[0].status === 'fulfilled') {
        setQueue(results[0].value.data || []);
      } else {
        console.error('Queue fetch failed:', results[0].reason);
        setQueue([]);
      }

      if (showMyPosition && results[1]?.status === 'fulfilled') {
        setMyPosition(results[1].value.data);
      }
    } catch (e) {
      console.error('fetchQueue error:', e);
    } finally {
      setLoading(false);
    }
  }, [showMyPosition]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Countdown ticker — ticks every minute
  useEffect(() => {
    if (!countdown) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setCooldownMins(null); return null; }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleGrantNext = async () => {
    setGranting(true);
    try {
      const res = await api.post('/queue/grant-next');
      toast.success(res.data.message);
      fetchQueue();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429) {
        setCooldownMins(data.remaining_minutes);
        setCountdown(data.remaining_minutes);
        toast.error(`Cooldown active — ${data.remaining_minutes} min remaining`);
      } else if (err.response?.status === 404) {
        toast.info('Queue is empty — nothing to grant.');
      } else {
        toast.error(data?.error || 'Failed to grant leave');
      }
    } finally {
      setGranting(false);
    }
  };

  const typeColor = (type) => ({
    annual: 'var(--orange)', sick: 'var(--success)',
    wellness: '#8B5CF6', emergency: '#DC2626',
  }[type] || '#6B7280');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Leave Queue</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            All pending leave requests — first submitted, first approved
          </p>
        </div>
        {showMyPosition && (
          <button
            onClick={() => navigate('/leave/request')}
            className="px-4 py-2 rounded-lg font-medium text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--orange)' }}
          >
            + New Request
          </button>
        )}
      </div>

      {/* ── Grant Next (Manager / HR only) ── */}
      {canGrant && (
        <div
          className="card border-2 transition-all"
          style={{ borderColor: cooldownMins ? 'var(--border)' : 'var(--orange)' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: cooldownMins ? '#F3F4F6' : 'var(--orange-pale)' }}
              >
                <Zap size={24} style={{ color: cooldownMins ? '#9CA3AF' : 'var(--orange)' }} />
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Grant Next Leave</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Approves the top person in the queue. Usable once every <strong>4 hours</strong>.
                </p>
                {cooldownMins && (
                  <div className="flex items-center gap-2 mt-2">
                    <Timer size={14} style={{ color: 'var(--warning)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
                      Available in {countdown ?? cooldownMins} min
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
              {granting ? 'Granting…' : queue.length === 0 ? 'Queue Empty' : 'Grant Leave to #1'}
            </button>
          </div>

          {/* Preview of #1 */}
          {queue.length > 0 && (
            <div className="mt-4 p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--orange-pale)' }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--orange)' }}
              >
                {queue[0].first_name?.charAt(0)}{queue[0].last_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{queue[0].first_name} {queue[0].last_name}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>
                  {queue[0].start_date} → {queue[0].end_date} · {queue[0].days_count} day{queue[0].days_count !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full text-white flex-shrink-0" style={{ background: 'var(--orange)' }}>
                #1 in queue
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── My position banner (non-manager/HR) ── */}
      {showMyPosition && (
        myPosition?.position ? (
          <div
            className="card border-l-4 flex items-center justify-between gap-4"
            style={{ borderLeftColor: 'var(--orange)', background: 'var(--orange-pale)' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ background: 'var(--orange)' }}
              >
                #{myPosition.position}
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  You're #{myPosition.position} in the queue
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Est. approval:{' '}
                  <span className="font-semibold">
                    {new Date(myPosition.estimated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/leave')}
              className="px-4 py-2 rounded-lg font-medium border-2 transition-all hover:-translate-y-0.5 flex-shrink-0"
              style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
            >
              My Requests
            </button>
          </div>
        ) : (
          <div className="card flex items-center gap-3" style={{ background: '#F0FDF4', borderLeft: '4px solid var(--success)' }}>
            <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            <p className="font-medium" style={{ color: 'var(--success)' }}>
              You have no pending requests in the queue.
            </p>
          </div>
        )
      )}

      {/* ── Info note ── */}
      <div className="card flex items-start gap-3" style={{ background: '#EFF6FF', borderLeft: '4px solid #3B82F6' }}>
        <Info size={18} style={{ color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
        <p className="text-sm" style={{ color: '#1E40AF' }}>
          Queue is FIFO — first submitted, first approved. Requests auto-approve when team workload drops below 50%.
          Emergency leaves bypass the queue entirely.
        </p>
      </div>

      {/* ── Queue list ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            All Queued Requests
          </h3>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Users size={16} />
            <span>{queue.length} request{queue.length !== 1 ? 's' : ''} waiting</span>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-16">
            <Clock size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-lg" style={{ color: 'var(--text-secondary)' }}>Queue is empty</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>All requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((req, idx) => {
              const myId = user?._id || user?.id;
              const reqUserId = req.user_id?.toString();
              const isMe = myId && reqUserId && reqUserId === myId.toString();
              const isTop = idx === 0;
              const pos = req.queue_position || idx + 1;
              const totalInQueue = queue.length;

              return (
                <div
                  key={req._id || req.id || idx}
                  className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md"
                  style={{
                    borderColor: isTop ? 'var(--orange)' : isMe ? '#8B5CF6' : 'var(--border)',
                    background: isTop ? 'var(--orange-pale)' : isMe ? '#F5F3FF' : 'white',
                  }}
                >
                  {/* Position badge */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                    style={{
                      background: isTop ? 'var(--orange)' : '#F3F4F6',
                      color: isTop ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {pos}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: isTop ? 'var(--orange-dark)' : '#6B7280' }}
                  >
                    {req.first_name?.charAt(0)}{req.last_name?.charAt(0)}
                  </div>

                  {/* Name + dates */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{req.first_name} {req.last_name}</span>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>
                          You
                        </span>
                      )}
                      {isTop && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: 'var(--orange)' }}>
                          Next up
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white capitalize"
                        style={{ background: typeColor(req.type) }}
                      >
                        {req.type}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {req.start_date
                        ? new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                      {req.end_date && req.end_date !== req.start_date
                        ? ` – ${new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : ''}
                      {req.days_count ? ` · ${req.days_count} day${req.days_count !== 1 ? 's' : ''}` : ''}
                    </p>
                  </div>

                  {/* Submitted */}
                  <div className="text-right text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    <p>Submitted</p>
                    <p className="font-semibold">
                      {new Date(req.createdAt || req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Progress bar — shows how close to front */}
                  <div className="w-20 flex-shrink-0">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          background: isTop ? 'var(--orange)' : '#D1D5DB',
                          width: `${Math.round(((totalInQueue - pos + 1) / totalInQueue) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-center mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {pos === 1 ? 'next' : `${pos} of ${totalInQueue}`}
                    </p>
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
