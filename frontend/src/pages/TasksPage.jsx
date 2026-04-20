import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { toast } from 'sonner';
import {
  CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Calendar, Users, Zap, RotateCcw, Eye, ShieldCheck, Send,
} from 'lucide-react';

const PRIORITY = {
  high:   { label: 'High',   color: '#DC2626', bg: '#FEF2F2' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FFF7ED' },
  low:    { label: 'Low',    color: '#22C55E', bg: '#F0FDF4' },
};

const VSTATUS = {
  pending_review: { label: 'Awaiting Review', color: '#F59E0B', bg: '#FFF7ED', icon: Eye },
  verified:       { label: 'Verified ✓',      color: '#22C55E', bg: '#F0FDF4', icon: ShieldCheck },
  auto_archived:  { label: 'Auto-Verified',   color: '#6B7280', bg: '#F9FAFB', icon: ShieldCheck },
  sent_back:      { label: 'Sent Back ↩',     color: '#DC2626', bg: '#FEF2F2', icon: RotateCcw },
};

// ── Completion / Resubmit Modal ───────────────────────────────────────────────
function CompletionModal({ task, onDone, onClose }) {
  const isResubmit = task.is_sent_back;
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const words = msg.trim().split(/\s+/).filter(Boolean).length;
  const enough = words >= 50;

  const submit = async () => {
    if (!enough) return;
    setSaving(true);
    try {
      if (isResubmit) {
        await api.patch(`/projects/${task.project_id}/tasks/${task.task_id}/resubmit`, { message: msg });
        toast.success('Resubmitted for review!');
      } else {
        await api.patch(`/projects/${task.project_id}/tasks/${task.task_id}/complete`, { message: msg });
        toast.success('Submitted for verification!');
      }
      onDone();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {isResubmit ? '🔄 Resubmit Task' : '📋 Submit for Verification'}
        </h3>
        <p className="text-sm mb-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>{task.title}</p>

        {isResubmit && task.feedback && (
          <div className="p-3 rounded-xl mb-4 border-l-4" style={{ borderLeftColor: '#DC2626', background: '#FEF2F2' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#DC2626' }}>Team Lead Feedback:</p>
            <p className="text-sm">{task.feedback}</p>
          </div>
        )}

        <div className="p-3 rounded-xl mb-4" style={{ background: '#EFF6FF' }}>
          <p className="text-xs" style={{ color: '#1E40AF' }}>
            Your submission will be reviewed by your team lead. It will <strong>auto-verify in 48 hours</strong> if not reviewed. Only verified completions count toward your progress.
          </p>
        </div>

        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Completion Note <span style={{ color: 'var(--text-secondary)' }}>(min 50 words)</span>
        </label>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          rows={6}
          placeholder={isResubmit ? 'Address the feedback and describe what was corrected...' : 'Describe what was accomplished, challenges faced, and the outcome...'}
          className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none"
          style={{ borderColor: enough ? 'var(--success)' : 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
        />
        <div className="flex items-center justify-between mt-2 mb-5">
          <span className="text-xs" style={{ color: enough ? 'var(--success)' : 'var(--text-secondary)' }}>
            {words} / 50 words {enough ? '✓' : 'required'}
          </span>
          <div className="w-32 bg-gray-200 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (words / 50) * 100)}%`, background: enough ? 'var(--success)' : 'var(--orange)' }} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={submit} disabled={!enough || saving} className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: isResubmit ? '#F59E0B' : 'var(--orange)' }}>
            <Send size={16} />
            {saving ? 'Submitting…' : isResubmit ? 'Resubmit' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onRefresh }) {
  const [expanded, setExpanded] = useState(task.is_sent_back); // auto-expand sent-back
  const [showModal, setShowModal] = useState(false);
  const pc = PRIORITY[task.priority] || PRIORITY.medium;
  const today = new Date().toISOString().split('T')[0];
  const isDueToday = task.due_date === today;
  const vs = task.verification_status ? VSTATUS[task.verification_status] : null;
  const VIcon = vs?.icon;

  const borderColor = task.is_sent_back ? '#DC2626'
    : task.is_verified ? '#22C55E'
    : task.is_pending_review ? '#F59E0B'
    : task.is_overdue ? '#DC2626'
    : isDueToday ? '#F59E0B'
    : 'var(--border)';

  const bgColor = task.is_sent_back ? '#FEF2F2'
    : task.is_verified ? '#F0FDF4'
    : task.is_pending_review ? '#FFFBEB'
    : 'white';

  return (
    <>
      <div className="card border-l-4 transition-all hover:shadow-md" style={{ borderLeftColor: borderColor, background: bgColor }}>
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className="flex-shrink-0 mt-0.5">
            {task.is_verified ? <ShieldCheck size={22} style={{ color: '#22C55E' }} />
              : task.is_sent_back ? <RotateCcw size={22} style={{ color: '#DC2626' }} />
              : task.is_pending_review ? <Eye size={22} style={{ color: '#F59E0B' }} />
              : task.is_overdue ? <AlertTriangle size={22} style={{ color: '#DC2626' }} />
              : isDueToday ? <Zap size={22} style={{ color: '#F59E0B' }} />
              : <Clock size={22} style={{ color: 'var(--text-secondary)' }} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-semibold ${task.is_verified ? 'line-through opacity-60' : ''}`}>{task.title}</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
              {vs && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1" style={{ background: vs.bg, color: vs.color }}>
                  {VIcon && <VIcon size={11} />} {vs.label}
                </span>
              )}
              {task.is_overdue && !task.is_submitted && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#DC2626' }}>Overdue</span>}
              {isDueToday && !task.is_submitted && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#F59E0B' }}>Due Today</span>}
            </div>

            <div className="flex items-center gap-4 mt-1 text-xs flex-wrap" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium" style={{ color: 'var(--orange)' }}>{task.project_name}</span>
              {task.due_date && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              <span className="flex items-center gap-1"><Users size={11} />{task.team_verified}/{task.total_assigned} verified</span>
              {task.team_pending > 0 && <span style={{ color: '#F59E0B' }}>{task.team_pending} pending review</span>}
            </div>

            {/* Auto-archive countdown */}
            {task.is_pending_review && task.auto_archive_in_hours !== null && (
              <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: '#F59E0B' }}>
                <Clock size={11} />
                Auto-verifies in {task.auto_archive_in_hours}h if not reviewed
              </div>
            )}

            {/* Sent-back feedback */}
            {task.is_sent_back && task.feedback && (
              <div className="mt-2 p-2 rounded-lg border-l-2 text-xs" style={{ borderLeftColor: '#DC2626', background: '#FEF2F2' }}>
                <span className="font-bold" style={{ color: '#DC2626' }}>Feedback: </span>
                {task.feedback}
              </div>
            )}

            {task.is_verified && task.verified_by && (
              <p className="text-xs mt-1" style={{ color: '#22C55E' }}>
                ✓ Verified by {task.verified_by?.first_name} {task.verified_by?.last_name}
                {task.verified_at && ` on ${new Date(task.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </p>
            )}
            {task.verification_status === 'auto_archived' && (
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>✓ Auto-verified after 48h inactivity</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Action button */}
            {!task.is_submitted && (
              <button onClick={() => setShowModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-0.5" style={{ background: 'var(--orange)' }}>
                Submit
              </button>
            )}
            {task.is_sent_back && (
              <button onClick={() => setShowModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-0.5 flex items-center gap-1" style={{ background: '#F59E0B' }}>
                <RotateCcw size={12} /> Resubmit
              </button>
            )}
            <button onClick={() => setExpanded(v => !v)} className="p-1 rounded hover:bg-gray-100">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
            {task.description && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>}

            {/* Team verification status */}
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Team Verification Status</p>
              <div className="flex flex-wrap gap-2">
                {task.assigned_members.map((m, i) => {
                  const mvs = m.verification_status ? VSTATUS[m.verification_status] : null;
                  return (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ background: mvs ? mvs.bg : '#F3F4F6' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: mvs?.color || '#9CA3AF' }}>
                        {m.first_name?.charAt(0)}{m.last_name?.charAt(0)}
                      </div>
                      <span style={{ color: mvs?.color || 'var(--text-secondary)' }}>{m.first_name} {m.last_name?.charAt(0)}.</span>
                      {mvs && <span className="text-xs">{mvs.label}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* My completion note */}
            {task.completion_message && (
              <div className="p-3 rounded-lg" style={{ background: 'var(--page-bg)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Your note {task.resubmit_count > 0 ? `(resubmitted ${task.resubmit_count}x)` : ''}:
                </p>
                <p className="text-xs">{task.completion_message}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && <CompletionModal task={task} onDone={onRefresh} onClose={() => setShowModal(false)} />}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/my-tasks');
      setData(res.data);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} /></div>;

  const stats = data?.stats || {};
  const tasks = data?.tasks || [];

  const filtered = tasks.filter(t => {
    if (filter === 'pending')    return !t.is_submitted && !t.is_overdue;
    if (filter === 'in_review')  return t.is_pending_review;
    if (filter === 'sent_back')  return t.is_sent_back;
    if (filter === 'verified')   return t.is_verified;
    if (filter === 'overdue')    return t.is_overdue;
    return true;
  });

  const pct = stats.completionRate ?? 0;
  const gaugeColor = pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#DC2626';
  const conicBg = `conic-gradient(${gaugeColor} ${pct * 3.6}deg, #E5E7EB ${pct * 3.6}deg)`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Tasks</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Verified completions count toward workload · Submissions auto-verify in 48h
          </p>
        </div>
        {stats.dueToday > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #F59E0B' }}>
            <Zap size={18} style={{ color: '#F59E0B' }} />
            <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>{stats.dueToday} due today</span>
          </div>
        )}
      </div>

      {/* Sent-back alert */}
      {stats.sentBack > 0 && (
        <div className="card border-l-4 flex items-center gap-4" style={{ borderLeftColor: '#DC2626', background: '#FEF2F2' }}>
          <RotateCcw size={24} style={{ color: '#DC2626' }} />
          <div>
            <p className="font-bold" style={{ color: '#DC2626' }}>{stats.sentBack} task{stats.sentBack !== 1 ? 's' : ''} sent back — action required</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your team lead has feedback. Review and resubmit.</p>
          </div>
          <button onClick={() => setFilter('sent_back')} className="ml-auto px-4 py-2 rounded-lg font-semibold text-white text-sm" style={{ background: '#DC2626' }}>
            View
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="relative w-14 h-14 flex-shrink-0">
            <div className="w-full h-full rounded-full" style={{ background: conicBg }}>
              <div className="absolute inset-1.5 bg-white rounded-full flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: gaugeColor }}>{pct}%</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: gaugeColor }}>{stats.verified}/{stats.total}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Verified</p>
          </div>
        </div>

        {[
          { key: 'pending',   label: 'Pending',    value: stats.pending,   color: 'var(--text-secondary)' },
          { key: 'in_review', label: 'In Review',  value: stats.inReview,  color: '#F59E0B' },
          { key: 'sent_back', label: 'Sent Back',  value: stats.sentBack,  color: '#DC2626' },
          { key: 'overdue',   label: 'Overdue',    value: stats.overdue,   color: '#DC2626' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            className="card text-left transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ borderLeft: filter === s.key ? `4px solid ${s.color}` : '4px solid transparent' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Half-day eligibility */}
      {stats.dueToday === 0 && stats.pending === 0 && stats.sentBack === 0 && (
        <div className="card border-l-4 flex items-center gap-4" style={{ borderLeftColor: 'var(--success)', background: '#F0FDF4' }}>
          <CheckCircle size={28} style={{ color: 'var(--success)' }} />
          <div className="flex-1">
            <p className="font-bold" style={{ color: 'var(--success)' }}>All tasks submitted — eligible for half-day!</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No pending tasks. Request a wellness half-day.</p>
          </div>
          <button onClick={() => navigate('/leave/request')} className="px-4 py-2 rounded-lg font-semibold text-white flex-shrink-0" style={{ background: 'var(--success)' }}>
            Request Half-Day
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { k: 'all',       l: `All (${tasks.length})` },
          { k: 'pending',   l: `Pending (${stats.pending ?? 0})` },
          { k: 'in_review', l: `In Review (${stats.inReview ?? 0})` },
          { k: 'sent_back', l: `Sent Back (${stats.sentBack ?? 0})` },
          { k: 'verified',  l: `Verified (${stats.verified ?? 0})` },
          { k: 'overdue',   l: `Overdue (${stats.overdue ?? 0})` },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: filter === f.k ? 'var(--orange)' : 'white', color: filter === f.k ? 'white' : 'var(--text-primary)', border: `2px solid ${filter === f.k ? 'var(--orange)' : 'var(--border)'}` }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <ShieldCheck size={48} className="mx-auto mb-4" style={{ color: 'var(--border)' }} />
          <p className="font-semibold text-lg" style={{ color: 'var(--text-secondary)' }}>
            {filter === 'verified' ? 'No verified tasks yet' : filter === 'sent_back' ? 'No tasks sent back 🎉' : 'No tasks here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => <TaskCard key={`${task.project_id}-${task.task_id}`} task={task} onRefresh={fetchTasks} />)}
        </div>
      )}
    </div>
  );
}
