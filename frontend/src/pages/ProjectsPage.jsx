import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import {
  Plus, X, CheckCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Users, BarChart2, Trash2,
  ShieldCheck, RotateCcw, Eye, MessageSquare,
} from 'lucide-react';

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: '#DC2626', bg: '#FEF2F2' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FFF7ED' },
  low:    { label: 'Low',    color: '#22C55E', bg: '#F0FDF4' },
};

const VSTATUS = {
  pending_review: { label: 'Awaiting Review', color: '#F59E0B', bg: '#FFF7ED' },
  verified:       { label: 'Verified',        color: '#22C55E', bg: '#F0FDF4' },
  auto_archived:  { label: 'Auto-Verified',   color: '#6B7280', bg: '#F9FAFB' },
  sent_back:      { label: 'Sent Back',       color: '#DC2626', bg: '#FEF2F2' },
};

const minDate = () => new Date().toISOString().split('T')[0];

// ── Send-Back Modal ───────────────────────────────────────────────────────────
function SendBackModal({ item, onDone, onClose }) {
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!feedback.trim()) { toast.error('Feedback required'); return; }
    setSaving(true);
    try {
      await api.patch(`/projects/${item.project_id}/tasks/${item.task_id}/completions/${item.completion_id}/send-back`, { feedback });
      toast.success('Sent back with feedback');
      onDone();
      onClose();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>↩️ Send Back</h3>
        <p className="text-sm mb-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>{item.task_title}</p>
        <p className="text-sm mb-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>Employee's note:</p>
        <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: 'var(--page-bg)' }}>{item.message}</div>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your Feedback *</label>
        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} placeholder="Explain what needs to be corrected or improved..." className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none resize-none" style={{ borderColor: 'var(--border)' }} />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={submit} disabled={!feedback.trim() || saving} className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: '#DC2626' }}>
            {saving ? 'Sending…' : 'Send Back'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Completion Modal (for employees in ProjectsPage) ──────────────────────────
function CompleteModal({ task, projectId, onDone, onClose }) {
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const words = msg.trim().split(/\s+/).filter(Boolean).length;
  const enough = words >= 50;

  const submit = async () => {
    if (!enough) return;
    setSaving(true);
    try {
      const res = await api.patch(`/projects/${projectId}/tasks/${task._id}/complete`, { message: msg });
      toast.success('Submitted for verification!');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Mark Task Complete</h3>
          <button onClick={onClose}><X size={22} /></button>
        </div>
        <p className="text-sm mb-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>Task</p>
        <p className="font-bold mb-4">{task.title}</p>
        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Completion Note <span style={{ color: 'var(--text-secondary)' }}>(minimum 50 words)</span>
        </label>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          rows={6}
          placeholder="Describe what was accomplished, any challenges faced, and the outcome of this task..."
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
          <button onClick={submit} disabled={!enough || saving} className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50" style={{ background: 'var(--success)' }}>
            {saving ? 'Saving…' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, projectId, myId, isLead, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const totalAssigned = task.assigned_to?.length || 0;
  const completedIds = new Set((task.completed_by || []).map(c => c.user_id?._id?.toString() || c.user_id?.toString()));
  const doneCount = task.assigned_to?.filter(u => completedIds.has(u._id?.toString() || u.toString())).length || 0;
  const allDone = totalAssigned > 0 && doneCount === totalAssigned;
  const myDone = completedIds.has(myId);
  const isAssigned = task.assigned_to?.some(u => (u._id?.toString() || u.toString()) === myId);
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && !allDone;

  return (
    <>
      <div
        className="flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-sm"
        style={{
          borderColor: allDone ? 'var(--success)' : overdue ? '#DC2626' : 'var(--border)',
          background: allDone ? '#F0FDF4' : overdue ? '#FEF2F2' : 'white',
        }}
      >
        {/* Status icon */}
        <div className="flex-shrink-0">
          {allDone
            ? <CheckCircle size={22} style={{ color: 'var(--success)' }} />
            : overdue
            ? <AlertTriangle size={22} style={{ color: '#DC2626' }} />
            : <Clock size={22} style={{ color: 'var(--text-secondary)' }} />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold ${allDone ? 'line-through opacity-60' : ''}`}>{task.title}</p>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
            {overdue && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#DC2626' }}>Overdue</span>}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {doneCount}/{totalAssigned} done
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-20 flex-shrink-0">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${totalAssigned ? (doneCount / totalAssigned) * 100 : 0}%`, background: allDone ? 'var(--success)' : 'var(--orange)' }} />
          </div>
          <p className="text-xs text-center mt-0.5" style={{ color: 'var(--text-secondary)' }}>{totalAssigned ? Math.round((doneCount / totalAssigned) * 100) : 0}%</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAssigned && !myDone && !allDone && (
            <button
              onClick={() => setShowComplete(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--orange)' }}
            >
              Mark Done
            </button>
          )}
          {myDone && <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>✓ Done</span>}
          <button onClick={() => setExpanded(v => !v)} className="p-1 rounded hover:bg-gray-100">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded: who completed, who hasn't */}
      {expanded && (
        <div className="ml-8 mb-2 p-4 rounded-xl border-l-4 space-y-3" style={{ borderLeftColor: 'var(--orange)', background: 'var(--page-bg)' }}>
          {task.description && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>}

          <div className="grid grid-cols-2 gap-4">
            {/* Completed */}
            <div>
              <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--success)' }}>
                Completed ({doneCount})
              </p>
              {task.assigned_to?.filter(u => completedIds.has(u._id?.toString())).map((u, i) => {
                const completion = task.completed_by?.find(c => (c.user_id?._id?.toString() || c.user_id?.toString()) === u._id?.toString());
                return (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--success)' }}>
                      {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{u.first_name} {u.last_name}</p>
                      {completion?.message && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{completion.message}</p>
                      )}
                      {completion?.completed_at && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(completion.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {doneCount === 0 && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No one yet</p>}
            </div>

            {/* Pending */}
            <div>
              <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#DC2626' }}>
                Pending ({totalAssigned - doneCount})
              </p>
              {task.assigned_to?.filter(u => !completedIds.has(u._id?.toString())).map((u, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#9CA3AF' }}>
                    {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                  </div>
                  <p className="text-xs font-semibold">{u.first_name} {u.last_name}</p>
                </div>
              ))}
              {totalAssigned - doneCount === 0 && <p className="text-xs" style={{ color: 'var(--success)' }}>All done!</p>}
            </div>
          </div>
        </div>
      )}

      {showComplete && (
        <CompleteModal task={task} projectId={projectId} onDone={onUpdate} onClose={() => setShowComplete(false)} />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const user = useAuthStore(s => s.user);
  const myId = user?._id?.toString() || user?.id?.toString();
  const isLead = user?.role === 'team_lead';
  const canVerify = ['team_lead','manager','hr','admin'].includes(user?.role);

  const [projects, setProjects] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [sendBackItem, setSendBackItem] = useState(null);

  const [pForm, setPForm] = useState({ name: '', description: '' });
  const [tForm, setTForm] = useState({ title: '', description: '', due_date: '', priority: 'medium' });
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const [projRes, verifyRes] = await Promise.all([
        api.get('/projects'),
        canVerify ? api.get('/projects/pending-verifications') : Promise.resolve({ data: [] }),
      ]);
      setProjects(projRes.data);
      setPendingVerifications(verifyRes.data);
      const exp = {};
      projRes.data.forEach(p => { exp[p._id || p.id] = true; });
      setExpandedProjects(exp);
    } catch (e) {
      toast.error('Failed to load projects');
    } finally { setLoading(false); }
  }, [canVerify]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleVerify = async (item) => {
    try {
      await api.patch(`/projects/${item.project_id}/tasks/${item.task_id}/completions/${item.completion_id}/verify`);
      toast.success('Task verified! Workload updated.');
      fetchProjects();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const createProject = async () => {
    if (!pForm.name.trim()) { toast.error('Project name required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/projects', pForm);
      setProjects(p => [res.data, ...p]);
      setExpandedProjects(e => ({ ...e, [res.data._id || res.data.id]: true }));
      setPForm({ name: '', description: '' });
      setShowNewProject(false);
      toast.success('Project created!');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const addTask = async (projectId) => {
    if (!tForm.title.trim()) { toast.error('Task title required'); return; }
    setSaving(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, tForm);
      setProjects(p => p.map(proj => (proj._id || proj.id) === projectId ? { ...res.data, id: res.data._id } : proj));
      setTForm({ title: '', description: '', due_date: '', priority: 'medium' });
      setShowAddTask(null);
      toast.success('Task added!');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(p => p.filter(proj => (proj._id || proj.id) !== id));
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const updateProject = (updated) => {
    setProjects(p => p.map(proj => (proj._id || proj.id) === (updated._id || updated.id) ? { ...updated, id: updated._id } : proj));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Verification Queue */}
      {canVerify && pendingVerifications.length > 0 && (
        <div className="card border-2" style={{ borderColor: '#F59E0B' }}>
          <div className="flex items-center gap-3 mb-4">
            <Eye size={24} style={{ color: '#F59E0B' }} />
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Verification Queue ({pendingVerifications.length})</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Review completions — auto-verifies in 48h if not actioned</p>
            </div>
          </div>
          <div className="space-y-3">
            {pendingVerifications.map((item, i) => (
              <div key={i} className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--page-bg)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--orange)' }}>
                        {item.employee?.first_name?.charAt(0)}{item.employee?.last_name?.charAt(0)}
                      </div>
                      <span className="font-semibold">{item.employee?.first_name} {item.employee?.last_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>{item.project_name}</span>
                      {item.resubmit_count > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF7ED', color: '#F59E0B' }}>Resubmit #{item.resubmit_count}</span>}
                    </div>
                    <p className="font-semibold text-sm mb-1">{item.task_title}</p>
                    <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>{item.message}</p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{item.hours_ago}h ago</span>
                      <span className="font-semibold" style={{ color: item.auto_archive_in_hours < 12 ? '#DC2626' : '#F59E0B' }}>
                        Auto-verifies in {item.auto_archive_in_hours}h
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleVerify(item)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#22C55E' }}>
                      <ShieldCheck size={14} /> Verify
                    </button>
                    <button onClick={() => setSendBackItem(item)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border-2" style={{ borderColor: '#DC2626', color: '#DC2626' }}>
                      <RotateCcw size={14} /> Send Back
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Projects</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Track task progress — workload updates automatically as tasks are completed
          </p>
        </div>
        {isLead && (
          <button onClick={() => setShowNewProject(v => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5" style={{ background: 'var(--orange)' }}>
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {/* New project form */}
      {showNewProject && isLead && (
        <div className="card border-2 space-y-4" style={{ borderColor: 'var(--orange)' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">New Project</h3>
            <button onClick={() => setShowNewProject(false)}><X size={20} /></button>
          </div>
          <input type="text" placeholder="Project name *" value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }} />
          <textarea placeholder="Description (optional)" rows={2} value={pForm.description} onChange={e => setPForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none resize-none" style={{ borderColor: 'var(--border)' }} />
          <div className="flex gap-3">
            <button onClick={() => setShowNewProject(false)} className="flex-1 py-2.5 rounded-lg border-2 font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={createProject} disabled={saving} className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </div>
      )}

      {/* Projects list */}
      {projects.length === 0 ? (
        <div className="card text-center py-16">
          <BarChart2 size={48} className="mx-auto mb-4" style={{ color: 'var(--border)' }} />
          <p className="font-semibold text-lg" style={{ color: 'var(--text-secondary)' }}>No projects yet</p>
          {isLead && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Create your first project above</p>}
        </div>
      ) : projects.map(project => {
        const pid = project._id || project.id;
        const isExpanded = expandedProjects[pid];
        const totalTasks = project.tasks?.length || 0;
        const doneTasks = project.tasks?.filter(t => {
          const completedIds = new Set((t.completed_by || []).map(c => c.user_id?._id?.toString() || c.user_id?.toString()));
          return t.assigned_to?.length > 0 && t.assigned_to.every(u => completedIds.has(u._id?.toString() || u.toString()));
        }).length || 0;
        const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
        const isMyProject = (project.team_lead_id?._id?.toString() || project.team_lead_id?.toString()) === myId;

        return (
          <div key={pid} className="card space-y-4">
            {/* Project header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize text-white" style={{ background: project.status === 'active' ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {project.status}
                  </span>
                  {project.team_id?.name && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>
                      {project.team_id.name}
                    </span>
                  )}
                </div>
                {project.description && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>}

                {/* Overall progress */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--orange)' }} />
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: pct === 100 ? 'var(--success)' : 'var(--orange)' }}>
                    {doneTasks}/{totalTasks} tasks · {pct}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isLead && isMyProject && (
                  <>
                    <button onClick={() => setShowAddTask(showAddTask === pid ? null : pid)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}>
                      <Plus size={14} /> Task
                    </button>
                    <button onClick={() => deleteProject(pid)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button onClick={() => setExpandedProjects(e => ({ ...e, [pid]: !e[pid] }))} className="p-1.5 rounded-lg hover:bg-gray-100">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {/* Add task form */}
            {showAddTask === pid && isLead && (
              <div className="p-4 rounded-xl border-2 space-y-3" style={{ borderColor: 'var(--orange)', background: 'var(--orange-pale)' }}>
                <p className="font-bold text-sm">Add Task</p>
                <input type="text" placeholder="Task title *" value={tForm.title} onChange={e => setTForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: 'var(--border)' }} />
                <textarea placeholder="Description" rows={2} value={tForm.description} onChange={e => setTForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none" style={{ borderColor: 'var(--border)' }} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Due Date</label>
                    <input type="date" min={minDate()} value={tForm.due_date} onChange={e => setTForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                    <select value={tForm.priority} onChange={e => setTForm(f => ({ ...f, priority: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddTask(null)} className="flex-1 py-2 rounded-lg border font-semibold text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
                  <button onClick={() => addTask(pid)} disabled={saving} className="flex-1 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50" style={{ background: 'var(--orange)' }}>
                    {saving ? 'Adding…' : 'Add Task'}
                  </button>
                </div>
              </div>
            )}

            {/* Tasks */}
            {isExpanded && (
              <div className="space-y-2">
                {project.tasks?.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No tasks yet{isLead ? ' — add one above' : ''}</p>
                ) : project.tasks.map((task, i) => (
                  <TaskRow
                    key={task._id || i}
                    task={task}
                    projectId={pid}
                    myId={myId}
                    isLead={isLead && isMyProject}
                    onUpdate={updateProject}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Send Back Modal */}
      {sendBackItem && (
        <SendBackModal
          item={sendBackItem}
          onDone={fetchProjects}
          onClose={() => setSendBackItem(null)}
        />
      )}
    </div>
  );
}
