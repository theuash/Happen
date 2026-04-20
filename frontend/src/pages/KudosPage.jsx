import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Plus, X, Megaphone } from 'lucide-react';

const VALUE_CONFIG = {
  teamwork:     { label: 'Teamwork',      emoji: '🤝', color: '#3B82F6', bg: '#EFF6FF' },
  innovation:   { label: 'Innovation',    emoji: '💡', color: '#8B5CF6', bg: '#F5F3FF' },
  leadership:   { label: 'Leadership',    emoji: '🌟', color: '#F59E0B', bg: '#FFF7ED' },
  helpfulness:  { label: 'Helpfulness',   emoji: '🙌', color: '#22C55E', bg: '#F0FDF4' },
  excellence:   { label: 'Excellence',    emoji: '🏆', color: '#F4631E', bg: '#FFF0E8' },
  above_beyond: { label: 'Above & Beyond',emoji: '🚀', color: '#DC2626', bg: '#FEF2F2' },
};

const REACTIONS = ['👏', '🔥', '❤️', '🎉', '🚀', '💯'];

function KudosCard({ kudos, myId, onReact }) {
  const vc = VALUE_CONFIG[kudos.value] || VALUE_CONFIG.excellence;
  const isAnnouncement = kudos.is_announcement;

  const reactionCounts = REACTIONS.reduce((acc, emoji) => {
    acc[emoji] = kudos.reactions?.filter(r => r.emoji === emoji).length || 0;
    return acc;
  }, {});

  return (
    <div
      className="card space-y-3"
      style={{
        borderLeft: `4px solid ${isAnnouncement ? '#F59E0B' : vc.color}`,
        background: isAnnouncement ? '#FFFBEB' : 'white',
      }}
    >
      {isAnnouncement && (
        <div className="flex items-center gap-2">
          <Megaphone size={16} style={{ color: '#F59E0B' }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#F59E0B' }}>Company Announcement</span>
        </div>
      )}

      {!isAnnouncement && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: vc.color }}>
            {kudos.from_id?.first_name?.charAt(0)}{kudos.from_id?.last_name?.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{kudos.from_id?.first_name} {kudos.from_id?.last_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>gave kudos to</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#6B7280' }}>
              {kudos.to_id?.first_name?.charAt(0)}{kudos.to_id?.last_name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold">{kudos.to_id?.first_name} {kudos.to_id?.last_name}</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: vc.bg, color: vc.color }}>{vc.emoji} {vc.label}</span>
            </div>
          </div>
        </div>
      )}

      {isAnnouncement && (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#F59E0B' }}>
            {kudos.from_id?.first_name?.charAt(0)}{kudos.from_id?.last_name?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold">{kudos.from_id?.first_name} {kudos.from_id?.last_name}</p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{kudos.from_id?.role?.replace('_',' ')}</p>
          </div>
        </div>
      )}

      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{kudos.message}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {REACTIONS.map(emoji => {
            const count = reactionCounts[emoji];
            const myReacted = kudos.reactions?.some(r => r.emoji === emoji && (r.user_id?.toString() === myId?.toString()));
            return (
              <button
                key={emoji}
                onClick={() => onReact(kudos._id || kudos.id, emoji)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-110"
                style={{ background: myReacted ? 'var(--orange-pale)' : '#F3F4F6', border: myReacted ? '1px solid var(--orange)' : '1px solid transparent' }}
              >
                {emoji}{count > 0 && <span className="font-semibold">{count}</span>}
              </button>
            );
          })}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {new Date(kudos.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

export default function KudosPage() {
  const user = useAuthStore(s => s.user);
  const myId = user?._id || user?.id;
  const canAnnounce = ['manager','hr','admin'].includes(user?.role);
  const [kudos, setKudos] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [form, setForm] = useState({ to_id: '', message: '', value: 'excellence' });
  const [announcement, setAnnouncement] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [kRes, cRes] = await Promise.all([api.get('/kudos'), api.get('/messages/contacts')]);
      setKudos(kRes.data);
      setContacts(cRes.data.filter(c => (c._id || c.id)?.toString() !== myId?.toString()));
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [myId]);

  useEffect(() => { fetch(); }, [fetch]);

  const send = async () => {
    if (!form.to_id || !form.message.trim()) { toast.error('Recipient and message required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/kudos', form);
      setKudos(p => [res.data, ...p]);
      setShowForm(false); setForm({ to_id: '', message: '', value: 'excellence' });
      toast.success('Kudos sent! 🎉');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const announce = async () => {
    if (!announcement.trim()) { toast.error('Message required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/kudos/announce', { message: announcement });
      setKudos(p => [res.data, ...p]);
      setShowAnnounce(false); setAnnouncement('');
      toast.success('Announcement sent to everyone!');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const react = async (id, emoji) => {
    try {
      const res = await api.post(`/kudos/${id}/react`, { emoji });
      setKudos(p => p.map(k => (k._id || k.id) === id ? { ...k, reactions: res.data.reactions } : k));
    } catch { /* silent */ }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Kudos & Recognition</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Celebrate wins, recognize teammates, keep culture alive</p>
        </div>
        <div className="flex gap-2">
          {canAnnounce && (
            <button onClick={() => setShowAnnounce(v => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border-2 transition-all" style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>
              <Megaphone size={18} /> Announce
            </button>
          )}
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white" style={{ background: 'var(--orange)' }}>
            <Plus size={18} /> Give Kudos
          </button>
        </div>
      </div>

      {showAnnounce && (
        <div className="card border-2 space-y-3" style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Megaphone size={20} style={{ color: '#F59E0B' }} /><h3 className="font-bold">Company Announcement</h3></div><button onClick={() => setShowAnnounce(false)}><X size={20} /></button></div>
          <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} rows={4} placeholder="Share a company update, milestone, or celebration with everyone…" className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none" style={{ borderColor: '#F59E0B' }} />
          <div className="flex gap-3">
            <button onClick={() => setShowAnnounce(false)} className="flex-1 py-2 rounded-lg border font-semibold text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={announce} disabled={saving} className="flex-1 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50" style={{ background: '#F59E0B' }}>{saving ? 'Sending…' : 'Send to Everyone'}</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card border-2 space-y-4" style={{ borderColor: 'var(--orange)' }}>
          <div className="flex items-center justify-between"><h3 className="font-bold text-lg">Give Kudos 🏆</h3><button onClick={() => setShowForm(false)}><X size={20} /></button></div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Recognize *</label>
            <select value={form.to_id} onChange={e => setForm(f => ({ ...f, to_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }}>
              <option value="">Select a teammate…</option>
              {contacts.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.first_name} {c.last_name} — {c.role?.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>Value Demonstrated</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(VALUE_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setForm(f => ({ ...f, value: k }))} className="p-2 rounded-xl text-center text-xs font-semibold transition-all" style={{ background: form.value === k ? v.bg : '#F9FAFB', color: form.value === k ? v.color : 'var(--text-secondary)', border: `2px solid ${form.value === k ? v.color : 'transparent'}` }}>
                  <div className="text-xl mb-1">{v.emoji}</div>{v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Message *</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder="Be specific — what did they do and why did it matter?" className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none resize-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border-2 font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={send} disabled={saving} className="flex-1 py-2.5 rounded-lg font-bold text-white disabled:opacity-50" style={{ background: 'var(--orange)' }}>{saving ? 'Sending…' : 'Send Kudos 🎉'}</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {kudos.length === 0 ? (
          <div className="card text-center py-16"><p className="text-4xl mb-4">🏆</p><p className="font-semibold text-lg" style={{ color: 'var(--text-secondary)' }}>No kudos yet</p><p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Be the first to recognize a teammate!</p></div>
        ) : kudos.map(k => <KudosCard key={k._id || k.id} kudos={k} myId={myId} onReact={react} />)}
      </div>
    </div>
  );
}
