import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Search, Plus, X, BookOpen, Pin, Tag, Edit2, Trash2, ChevronLeft } from 'lucide-react';

const CAT_CONFIG = {
  sop:        { label: 'SOP',        color: '#3B82F6', bg: '#EFF6FF' },
  onboarding: { label: 'Onboarding', color: '#22C55E', bg: '#F0FDF4' },
  policy:     { label: 'Policy',     color: '#F59E0B', bg: '#FFF7ED' },
  general:    { label: 'General',    color: '#6B7280', bg: '#F9FAFB' },
};

function renderMarkdown(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled /><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function WikiPage() {
  const user = useAuthStore(s => s.user);
  const canEdit = ['manager','hr','admin','team_lead'].includes(user?.role);
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '', is_pinned: false });
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (category) params.set('category', category);
      const res = await api.get(`/wiki?${params}`);
      setPages(res.data);
    } catch { toast.error('Failed to load wiki'); }
    finally { setLoading(false); }
  }, [search, category]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      if (editing) {
        const res = await api.patch(`/wiki/${editing}`, payload);
        setPages(p => p.map(pg => (pg._id || pg.id) === editing ? { ...res.data, id: res.data._id } : pg));
        if (selected?._id === editing || selected?.id === editing) setSelected({ ...res.data, id: res.data._id });
      } else {
        const res = await api.post('/wiki', payload);
        setPages(p => [{ ...res.data, id: res.data._id }, ...p]);
      }
      setShowForm(false); setEditing(null);
      setForm({ title: '', content: '', category: 'general', tags: '', is_pinned: false });
      toast.success(editing ? 'Page updated!' : 'Page created!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const deletePage = async (id) => {
    if (!window.confirm('Delete this page?')) return;
    try {
      await api.delete(`/wiki/${id}`);
      setPages(p => p.filter(pg => (pg._id || pg.id) !== id));
      if ((selected?._id || selected?.id) === id) setSelected(null);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const startEdit = (page) => {
    setEditing(page._id || page.id);
    setForm({ title: page.title, content: page.content, category: page.category, tags: (page.tags || []).join(', '), is_pinned: page.is_pinned });
    setShowForm(true);
  };

  if (selected) {
    const cc = CAT_CONFIG[selected.category] || CAT_CONFIG.general;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--orange)' }}>
            <ChevronLeft size={16} /> Back to Wiki
          </button>
        </div>
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {selected.is_pinned && <Pin size={16} style={{ color: 'var(--orange)' }} />}
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: cc.bg, color: cc.color }}>{cc.label}</span>
                {selected.tags?.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-xs" style={{ background: '#F3F4F6', color: '#6B7280' }}>#{t}</span>)}
              </div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{selected.title}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                By {selected.author_id?.first_name} {selected.author_id?.last_name} · Updated {new Date(selected.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button onClick={() => startEdit(selected)} className="p-2 rounded-lg hover:bg-gray-100"><Edit2 size={16} /></button>
                <button onClick={() => deletePage(selected._id || selected.id)} className="p-2 rounded-lg hover:bg-red-50" style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
              </div>
            )}
          </div>
          <div className="prose max-w-none text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.content || '') }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Company Wiki</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>SOPs, policies, onboarding docs — all in one place</p>
        </div>
        {canEdit && (
          <button onClick={() => { setShowForm(v => !v); setEditing(null); setForm({ title: '', content: '', category: 'general', tags: '', is_pinned: false }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white" style={{ background: 'var(--orange)' }}>
            <Plus size={18} /> New Page
          </button>
        )}
      </div>

      {showForm && (
        <div className="card border-2 space-y-4" style={{ borderColor: 'var(--orange)' }}>
          <div className="flex items-center justify-between"><h3 className="font-bold">{editing ? 'Edit Page' : 'New Wiki Page'}</h3><button onClick={() => { setShowForm(false); setEditing(null); }}><X size={20} /></button></div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Page title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="col-span-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }}>
              {Object.entries(CAT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input type="text" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
          </div>
          <textarea placeholder="Content (supports Markdown: # Heading, **bold**, - list, `code`)" rows={12} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none resize-none" style={{ borderColor: 'var(--border)' }} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} style={{ accentColor: 'var(--orange)' }} />
              Pin to top
            </label>
            <div className="flex-1" />
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 rounded-lg border font-semibold text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50" style={{ background: 'var(--orange)' }}>{saving ? 'Saving…' : editing ? 'Update' : 'Publish'}</button>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
          <input type="text" placeholder="Search wiki…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none" style={{ borderColor: 'var(--border)' }} />
        </div>
        <div className="flex gap-2">
          {[{ k: '', l: 'All' }, ...Object.entries(CAT_CONFIG).map(([k, v]) => ({ k, l: v.label }))].map(f => (
            <button key={f.k} onClick={() => setCategory(f.k)} className="px-3 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: category === f.k ? 'var(--orange)' : 'white', color: category === f.k ? 'white' : 'var(--text-primary)', border: `2px solid ${category === f.k ? 'var(--orange)' : 'var(--border)'}` }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--orange)' }} /></div>
      : pages.length === 0 ? (
        <div className="card text-center py-16"><BookOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--border)' }} /><p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No pages found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pages.map(page => {
            const cc = CAT_CONFIG[page.category] || CAT_CONFIG.general;
            return (
              <div key={page._id || page.id} className="card cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1" onClick={() => setSelected(page)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {page.is_pinned && <Pin size={14} style={{ color: 'var(--orange)' }} />}
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: cc.bg, color: cc.color }}>{cc.label}</span>
                  </div>
                  {canEdit && (
                    <button onClick={e => { e.stopPropagation(); deletePage(page._id || page.id); }} className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100" style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                  )}
                </div>
                <h3 className="font-bold mb-2">{page.title}</h3>
                <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{page.content?.replace(/[#*`\[\]]/g, '').substring(0, 120)}…</p>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{page.author_id?.first_name} {page.author_id?.last_name}</span>
                  <span>{new Date(page.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                {page.tags?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {page.tags.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#F3F4F6', color: '#6B7280' }}>#{t}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
