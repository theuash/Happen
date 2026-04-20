import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import { formatApiErrorDetail } from '../utils/formatError';
import { CalendarCheck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

function ScheduleLeavePanel() {
  const user = useAuthStore((s) => s.user);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [workload, setWorkload] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);

  useEffect(() => {
    fetchWorkload();
    fetchMyLeaves();
  }, []);

  const fetchWorkload = async () => {
    try {
      const res = await api.get('/company/workload');
      const teams = res.data;
      const avg = teams.length
        ? Math.round(teams.reduce((s, t) => s + (t.workload_current || 0), 0) / teams.length)
        : 0;
      setWorkload(avg);
    } catch {
      setWorkload(null);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await api.get('/manager-leave');
      setMyLeaves(res.data.filter((l) => l.user_id === user?.id).slice(0, 3));
    } catch {
      // silent
    }
  };

  const days = () => {
    if (!startDate || !endDate) return 0;
    return Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
  };

  const canSchedule = workload !== null && workload <= 50;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSchedule) return;
    setLoading(true);
    try {
      const res = await api.post('/manager-leave', { start_date: startDate, end_date: endDate, reason });
      toast.success(`Leave scheduled. ${res.data.notified} people notified.`);
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchMyLeaves();
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error;
      toast.error(formatApiErrorDetail(detail) || 'Failed to schedule leave');
    } finally {
      setLoading(false);
    }
  };

  const workloadColor = workload === null ? 'var(--text-secondary)'
    : workload > 80 ? '#DC2626'
    : workload > 50 ? '#F59E0B'
    : '#22C55E';

  const workloadLabel = workload === null ? '—'
    : workload > 80 ? 'High'
    : workload > 50 ? 'Medium'
    : 'Low / OK';

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3">
        <CalendarCheck size={24} style={{ color: 'var(--orange)' }} />
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Schedule Your Leave
        </h3>
      </div>

      {/* Workload gate indicator */}
      <div
        className="flex items-center justify-between p-3 rounded-lg"
        style={{ background: canSchedule ? '#F0FDF4' : '#FFF7ED' }}
      >
        <div className="flex items-center gap-2">
          {canSchedule
            ? <CheckCircle size={18} style={{ color: '#22C55E' }} />
            : <AlertTriangle size={18} style={{ color: '#F59E0B' }} />}
          <span className="text-sm font-medium">
            Company workload:&nbsp;
            <span style={{ color: workloadColor }}>
              {workload !== null ? `${workload}%` : '…'} — {workloadLabel}
            </span>
          </span>
        </div>
        {!canSchedule && workload !== null && (
          <span className="text-xs" style={{ color: '#F59E0B' }}>
            Must be ≤ 50% to schedule
          </span>
        )}
      </div>

      {!canSchedule && workload !== null && (
        <div
          className="p-3 rounded-lg border-l-4 text-sm"
          style={{ borderLeftColor: '#F59E0B', background: '#FFF7ED', color: '#92400E' }}
        >
          Workload is currently too high. You can schedule leave once it drops to medium or below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={!canSchedule}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
              required
              disabled={!canSchedule}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
            />
          </div>
        </div>

        {days() > 0 && (
          <p className="text-sm text-center font-semibold" style={{ color: 'var(--orange)' }}>
            {days()} day{days() !== 1 ? 's' : ''}
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            Note (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            disabled={!canSchedule}
            placeholder="e.g. Out of office — contact deputy"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !canSchedule}
          className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--orange)' }}
        >
          {loading ? 'Scheduling…' : 'Schedule & Notify Everyone'}
        </button>
      </form>

      {/* Recent scheduled leaves */}
      {myLeaves.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Your upcoming leaves
          </p>
          <div className="space-y-2">
            {myLeaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: 'var(--orange)' }} />
                  <span>
                    {new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' – '}
                    {new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ background: '#22C55E' }}
                >
                  approved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleLeavePanel;
