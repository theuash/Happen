import { useEffect, useState } from 'react';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Heart, CheckCircle, Leaf } from 'lucide-react';

export default function WellnessPage() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/wellness/balance');
      setBalance(res.data);
    } catch (e) {
      // fallback to /me/wellness-balance
      try {
        const res2 = await api.get('/me/wellness-balance');
        setBalance({ used: res2.data.used, total: res2.data.total, remaining: res2.data.total - res2.data.used });
      } catch { console.error('Could not fetch wellness balance'); }
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/me/leave-requests');
      setHistory(res.data.filter(r => r.type === 'wellness').slice(0, 5));
    } catch { /* silent */ }
  };

  const handleRequest = async () => {
    setLoading(true);
    try {
      const res = await api.post('/wellness/request');
      toast.success(res.data.message);
      setBalance({ used: res.data.used, total: res.data.total, remaining: res.data.remaining });
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.error || e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  const used      = balance?.used ?? 0;
  const total     = balance?.total ?? 2;
  const remaining = balance?.remaining ?? (total - used);
  const pct       = total > 0 ? (used / total) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="wellness-page">
      {/* Header card */}
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

        {/* Balance display */}
        <div>
          <div className="text-7xl font-bold mb-1" style={{ color: remaining > 0 ? 'var(--orange)' : '#9CA3AF' }}>
            {remaining}
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            of {total} wellness day{total !== 1 ? 's' : ''} remaining this year
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 mt-4 max-w-xs mx-auto">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct >= 100 ? '#9CA3AF' : 'var(--orange)' }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            {used} used · {remaining} remaining
          </p>
        </div>

        {/* Take button */}
        <button
          onClick={handleRequest}
          disabled={loading || remaining <= 0}
          className="px-10 py-4 rounded-xl text-lg font-bold text-white transition-all hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
          style={{ background: remaining > 0 ? 'var(--orange)' : '#9CA3AF' }}
          data-testid="take-wellness-day-button"
        >
          <Heart size={22} />
          {loading ? 'Processing…' : remaining > 0 ? 'Take a Wellness Day' : 'No Days Remaining'}
        </button>

        {remaining <= 0 && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            You've used all your wellness days for this year.
          </p>
        )}
      </div>

      {/* What is a wellness day */}
      <div className="card space-y-3" style={{ background: 'var(--orange-pale)', border: '1px solid var(--orange)' }}>
        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>What is a Wellness Day?</h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {[
            'A full paid day off — no reason needed',
            'Auto-approved instantly when you click the button',
            'Your team lead and manager are notified',
            'You get 2 wellness days per year',
            'Can be taken any day, including today',
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
                      {r.start_date ? new Date(r.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
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
    </div>
  );
}
