import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Send, Search, CheckCheck, Check, MessageSquare, Users } from 'lucide-react';

const ROLE_COLORS = {
  admin: '#7C3AED', manager: '#F59E0B', hr: '#EC4899',
  team_lead: '#0EA5E9', accounting: '#22C55E', employee: '#F4631E',
};

function Av({ u, size = 40 }) {
  const bg = ROLE_COLORS[u?.role] || 'var(--orange)';
  const initials = `${u?.first_name?.charAt(0) || ''}${u?.last_name?.charAt(0) || ''}`.toUpperCase() || '?';
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ contact, myId, onMsg }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottom = useRef(null);
  const poll = useRef(null);
  const cid = contact?._id?.toString() || contact?.id?.toString();

  const load = useCallback(async () => {
    if (!cid) return;
    try { const r = await api.get(`/messages/${cid}`); setMsgs(r.data); } catch { }
  }, [cid]);

  useEffect(() => {
    if (!cid) return;
    setLoading(true); setMsgs([]);
    load().finally(() => setLoading(false));
    poll.current = setInterval(load, 3000);
    return () => clearInterval(poll.current);
  }, [cid, load]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await api.post(`/messages/${cid}`, { text: text.trim() });
      setMsgs(p => [...p, r.data]);
      setText('');
      onMsg?.();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const ft = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const fd = (d) => {
    const t = new Date(), dt = new Date(d);
    if (dt.toDateString() === t.toDateString()) return 'Today';
    const y = new Date(t); y.setDate(t.getDate() - 1);
    if (dt.toDateString() === y.toDateString()) return 'Yesterday';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const grouped = msgs.reduce((a, m) => {
    const d = fd(m.createdAt || m.created_at);
    if (!a[d]) a[d] = [];
    a[d].push(m);
    return a;
  }, {});

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <MessageSquare size={56} className="mb-4" style={{ color: 'var(--border)' }} />
        <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Select a conversation</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Pick someone from the list to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-5 py-3 border-b bg-white flex items-center gap-3 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <Av u={contact} size={40} />
        <div>
          <p className="font-bold">{contact.first_name} {contact.last_name}</p>
          <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
            {contact.role?.replace('_', ' ')} {contact.team_name ? `· ${contact.team_name}` : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: 'var(--page-bg)' }}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--orange)' }} />
          </div>
        ) : msgs.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>No messages yet. Say hi! 👋</p>
        ) : (
          Object.entries(grouped).map(([date, ms]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>{date}</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              {ms.map((m, i) => {
                const mine = m.sender_id?.toString() === myId;
                return (
                  <div key={m._id || i} className={`flex gap-2 mb-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!mine && <Av u={contact} size={32} />}
                    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
                      <div
                        className="px-4 py-2.5 rounded-2xl text-sm"
                        style={{
                          background: mine ? 'var(--orange)' : 'white',
                          color: mine ? 'white' : 'var(--text-primary)',
                          borderBottomRightRadius: mine ? 4 : 16,
                          borderBottomLeftRadius: mine ? 16 : 4,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
                        }}
                      >
                        {m.text}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 px-1">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ft(m.createdAt || m.created_at)}</span>
                        {mine && (m.is_read
                          ? <CheckCheck size={12} style={{ color: 'var(--orange)' }} />
                          : <Check size={12} style={{ color: 'var(--text-secondary)' }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Message ${contact.first_name}…`}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border resize-none focus:outline-none focus:ring-2 text-sm"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)', maxHeight: 100 }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 flex-shrink-0"
            style={{ background: 'var(--orange)' }}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore(s => s.user);
  const myId = user?._id?.toString() || user?.id?.toString();

  const [contacts, setContacts] = useState([]);
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState('');
  const [loadingC, setLoadingC] = useState(true);

  const fetchC = useCallback(async () => {
    try {
      const r = await api.get('/messages/contacts');
      setContacts(r.data);
      const cp = searchParams.get('contact');
      if (cp) {
        const found = r.data.find(c => (c._id?.toString() || c.id?.toString()) === cp);
        if (found) setActive(found);
      }
    } catch { }
    finally { setLoadingC(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetchC(); }, [fetchC]);

  // Refresh unread counts every 5s
  useEffect(() => {
    const t = setInterval(() => {
      api.get('/messages/contacts').then(r => setContacts(r.data)).catch(() => { });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const open = (c) => {
    setActive(c);
    setSearchParams({ contact: c._id?.toString() || c.id?.toString() });
  };

  const filtered = contacts.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase()) ||
    c.team_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = contacts.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="flex rounded-2xl overflow-hidden border bg-white" style={{ borderColor: 'var(--border)', height: 'calc(100vh - 112px)' }}>

      {/* ── Left sidebar ── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)' }}>

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Messages</h2>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'var(--orange)' }}>
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Users size={13} />
              <span>{contacts.length}</span>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search people…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loadingC ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: 'var(--orange)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No contacts found</p>
          ) : (
            filtered.map(c => {
              const cid = c._id?.toString() || c.id?.toString();
              const isActive = (active?._id?.toString() || active?.id?.toString()) === cid;
              const roleColor = ROLE_COLORS[c.role] || 'var(--orange)';
              return (
                <button
                  key={cid}
                  onClick={() => open(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                  style={{ background: isActive ? 'var(--orange-pale)' : 'transparent' }}
                >
                  {/* Avatar with role color */}
                  <div className="relative flex-shrink-0">
                    <Av u={c} size={40} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{c.first_name} {c.last_name}</p>
                      {c.last_message && (
                        <span className="text-xs flex-shrink-0 ml-1" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(c.last_message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {c.last_message
                          ? c.last_message.text
                          : `${c.role?.replace('_', ' ')}${c.team_name ? ' · ' + c.team_name : ''}`}
                      </p>
                      {c.unread_count > 0 && (
                        <span
                          className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'var(--orange)' }}
                        >
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    {/* Role tag */}
                    <span
                      className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold capitalize"
                      style={{ background: `${roleColor}18`, color: roleColor }}
                    >
                      {c.role?.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: chat ── */}
      <ChatPanel contact={active} myId={myId} onMsg={fetchC} />
    </div>
  );
}
