import { useEffect, useState, useCallback } from 'react';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Heart, CheckCircle, Leaf, AlertTriangle, ArrowRight, X } from 'lucide-react';

export default function WellnessPage() {
  const [balance, setBalance]     = useState(null);
  const [check, setCheck]         = useState(null);   // pre-flight check result
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [balRes, checkRes, histRes] = await Promise.all([
        api.get('/wellness/balance'),
        api.get('/wellness/check'),
        api.get('/me/leave-requests'),
      ]);
      setBalance(balRes.data);
      setCheck(checkRes.data);
      setHistory(histRes.data.filter(r => r.type === 'wellness').slice(0, 5));
    } catch (e) {
      console.error('Wellness fetch error:', e);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRequest = async () => {
    setLoading(true);
    setShowConfirm(false);
    try {
      const res = await api.post('/wellness/request');
      toast.success(res.data.message);
      setBalance({ used: res.data.used, total: res.data.total, remaining: res.data.remaining });
      // Refresh check + history
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const used      = balance?.used ?? 0;
  const total     = balance?.total ?? 2;
  const remaining = balance?.remaining ?? (total - used);
  const pct       = total > 0 ? (used / total) * 100 : 0;
  const tasksToPush = check?.tasks_to_push || [];
  const canTake   = remaining > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="wellness-page">

      {/* Main card */}
      <div className="card text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--orange-pale)' }}>
            <Leaf size={28} style={{ color: 'var(--orange)' }} />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Wellness Days</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Take time for self-care. No questions asked.</p>
          </div>
        </div>

        {/* Balance */}
        <div>
          <div className="text-7xl font-bold mb-1" style={{ color: canTake ? 'var(--orange)' : '#9CA3AF' }}>
            {remaining}
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            of {total} wellness day{total !== 1 ? 's' : ''} remaining this year
          </p>
          <div className="w-full bg-gray-100 rounded-full h-3 mt-4 max-w-xs mx-auto">
            <div className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct >= 100 ? '#9CA3AF' : 'var(--orange)' }} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{used} used · {remaining} remaining</p>
        </div>

        {/* Tasks-to-push notice */}
        {canTake && tasksToPush.length > 0 && (
          <div className="p-4 rounded-xl text-left" style={{ background: '#FFF7ED', border: '1px solid #F59E0B' }}>
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
                {tasksToPush.length} task{tasksToPush.length !== 1 ? 's' : ''} due today will be moved to tomorrow
              </p>
            </div>
            <ul className="space-y-1 ml-6">
              {tasksToPush.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: '#92400E' }}>
                  <ArrowRight size={13} />
                  <span className="font-medium">{t.task_title}</span>
                  <span style={{ color: '#B45309' }}>· {t.project_name}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold capitalize"
                    style={{ background: t.priority === 'high' ? '#FEF2F2' : '#FFF7ED', color: t.priority === 'high' ? '#DC2626' : '#F59E0B' }}>
                    {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canTake && tasksToPush.length === 0 && check && (
          <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: '#F0FDF4', border: '1px solid #22C55E' }}>
            <CheckCircle size={18} style={{ color: '#22C55E' }} />
            <p className="text-sm font-medium" style={{ color: '#166534' }}>No tasks due today — you're free to take a wellness day!</p>
          </div>
        )}

        {/* Take button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading || !canTake}
          className="px-10 py-4 rounded-xl text-lg font-bold text-white transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
          style={{ background: canTake ? 'var(--orange)' : '#9CA3AF' }}
          data-testid="take-wellness-day-button"
        >
          <Heart size={22} />
          {loading ? 'Processing…' : canTake ? 'Take a Wellness Day' : 'No Days Remaining'}
        </button>

        {!canTake && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            You've used all your wellness days for this year.
          </p>
        )}
      </div>

      {/* What is a wellness day */}
      <div className="card space-y-3" style={{ background: 'var(--orange-pale)', border: '1px solid var(--orange)' }}>
        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>How it works</h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {[
            'A full paid day off — no reason needed',
            'Auto-approved instantly when you confirm',
            'Any tasks due today are automatically moved to tomorrow',
            'Your team lead and manager are notified',
            'You get 2 wellness days per year',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle size={16} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Your Wellness History</h3>
          <div className="space-y-2">
            {history.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--page-bg)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--orange-pale)' }}>
                    <Leaf size={16} style={{ color: 'var(--orange)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Wellness Day</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {r.start_date
                        ? new Date(r.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'var(--success)' }}>
                  Approved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Confirm Wellness Day</h3>
              <button onClick={() => setShowConfirm(false)}><X size={22} /></button>
            </div>

            <div className="p-4 rounded-xl mb-5" style={{ background: 'var(--orange-pale)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Taking a wellness day for today
              </p>
              {tasksToPush.length > 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong>{tasksToPush.length} task{tasksToPush.length !== 1 ? 's' : ''}</strong> due today will be automatically moved to tomorrow.
                </p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No tasks due today. Enjoy your day off!
                </p>
              )}
            </div>

            {tasksToPush.length > 0 && (
              <div className="mb-5 space-y-1">
                {tasksToPush.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{ background: 'var(--page-bg)' }}>
                    <ArrowRight size={14} style={{ color: '#F59E0B' }} />
                    <span className="font-medium flex-1 truncate">{t.task_title}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>→ tomorrow</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 font-semibold"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleRequest} disabled={loading}
                className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'var(--orange)' }}>
                <Heart size={18} />
                {loading ? 'Processing…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
