import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import {
  Send, Search, Video, Calendar, Plus, X, Clock,
  CheckCheck, Check, Users, MessageSquare,
} from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const ROLE_COLORS = {
  admin: '#7C3AED', manager: '#F59E0B', hr: '#EC4899',
  team_lead: '#0EA5E9', accounting: '#22C55E', employee: '#F4631E',
};

function Avatar({ user, size = 10, color }) {
  const bg = color || ROLE_COLORS[user?.role] || 'var(--orange)';
  const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: bg, width: `${size * 4}px`, height: `${size * 4}px`, fontSize: `${size * 1.4}px` }}
    >
      {initials}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ contact, currentUser, socket, onlineUsers }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const contactId = contact?._id?.toString() || contact?.id?.toString();
  const myId = currentUser?._id?.toString() || currentUser?.id?.toString();
  const isOnline = onlineUsers.includes(contactId);

  useEffect(() => {
    if (!contact) return;
    setLoading(true);
    api.get(`/messages/${contactId}`)
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contactId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      const msgSender = msg.sender_id?.toString();
      const msgReceiver = msg.receiver_id?.toString();
      if (
        (msgSender === myId && msgReceiver === contactId) ||
        (msgSender === contactId && msgReceiver === myId)
      ) {
        setMessages(prev => {
          if (prev.find(m => m._id?.toString() === msg._id?.toString())) return prev;
          return [...prev, msg];
        });
      }
    };
    const typingHandler = ({ from, isTyping: t }) => {
      if (from === contactId) setIsTyping(t);
    };
    socket.on('new_message', handler);
    socket.on('typing', typingHandler);
    return () => { socket.off('new_message', handler); socket.off('typing', typingHandler); };
  }, [socket, contactId, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = () => {
    if (!text.trim() || !socket) return;
    socket.emit('send_message', { to: contactId, text: text.trim() });
    setText('');
    socket.emit('typing', { to: contactId, isTyping: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!socket) return;
    socket.emit('typing', { to: contactId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { to: contactId, isTyping: false });
    }, 1500);
  };

  const fmt = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = fmtDate(msg.createdAt || msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <MessageSquare size={64} className="opacity-10 mb-4" />
        <p className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>Select a conversation</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Choose someone from the left to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat header */}
      <div className="px-5 py-4 border-b bg-white flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <Avatar user={contact} size={10} />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: 'var(--success)' }} />
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold">{contact.first_name} {contact.last_name}</p>
          <p className="text-xs capitalize" style={{ color: isOnline ? 'var(--success)' : 'var(--text-secondary)' }}>
            {isOnline ? 'Online' : 'Offline'} · {contact.role?.replace('_', ' ')} · {contact.team_name || ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ background: 'var(--page-bg)' }}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--orange)' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No messages yet. Say hi! 👋</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>{date}</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              {msgs.map((msg, i) => {
                const isMine = msg.sender_id?.toString() === myId;
                return (
                  <div key={msg._id || i} className={`flex gap-2 mb-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && <Avatar user={contact} size={8} />}
                    <div className={`max-w-xs lg:max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                        style={{
                          background: isMine ? 'var(--orange)' : 'white',
                          color: isMine ? 'white' : 'var(--text-primary)',
                          borderBottomRightRadius: isMine ? '4px' : '16px',
                          borderBottomLeftRadius: isMine ? '16px' : '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        }}
                      >
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{fmt(msg.createdAt || msg.created_at)}</span>
                        {isMine && (msg.is_read
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
        {isTyping && (
          <div className="flex gap-2 items-center">
            <Avatar user={contact} size={8} />
            <div className="px-4 py-3 rounded-2xl bg-white shadow-sm flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-secondary)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-3">
          <textarea
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${contact.first_name}…`}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border resize-none focus:outline-none focus:ring-2 text-sm"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: 'var(--orange)' }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Meetings Tab ──────────────────────────────────────────────────────────────
function MeetingsTab({ currentUser }) {
  const [meetings, setMeetings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', link: '', attendee_ids: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const myId = currentUser?._id?.toString() || currentUser?.id?.toString();

  useEffect(() => {
    Promise.all([api.get('/meetings'), api.get('/messages/contacts')])
      .then(([m, c]) => { setMeetings(m.data); setContacts(c.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleAttendee = (id) => {
    setForm(f => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(id)
        ? f.attendee_ids.filter(x => x !== id)
        : [...f.attendee_ids, id],
    }));
  };

  const createMeeting = async () => {
    if (!form.title || !form.start_time || !form.end_time) {
      toast.error('Title, start and end time are required'); return;
    }
    setSaving(true);
    try {
      const res = await api.post('/meetings', form);
      setMeetings(prev => [...prev, res.data]);
      setShowForm(false);
      setForm({ title: '', description: '', start_time: '', end_time: '', link: '', attendee_ids: [] });
      toast.success('Meeting scheduled!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create meeting');
    } finally { setSaving(false); }
  };

  const cancelMeeting = async (id) => {
    try {
      await api.patch(`/meetings/${id}/cancel`);
      setMeetings(prev => prev.filter(m => m.id !== id && m._id !== id));
      toast.success('Meeting cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  const upcoming = meetings.filter(m => new Date(m.start_time) >= new Date());
  const past     = meetings.filter(m => new Date(m.start_time) < new Date());

  const fmtMeeting = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--orange)' }} /></div>;

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Meetings</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--orange)' }}
        >
          <Plus size={16} /> Schedule Meeting
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card border-2 space-y-4" style={{ borderColor: 'var(--orange)' }}>
          <div className="flex items-center justify-between">
            <h4 className="font-bold">New Meeting</h4>
            <button onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>

          <input
            type="text" placeholder="Meeting title *"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
          />
          <textarea
            placeholder="Description (optional)" rows={2}
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Start *</label>
              <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>End *</label>
              <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }} />
            </div>
          </div>
          <input
            type="url" placeholder="Video call link (optional)"
            value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
          />

          {/* Attendees */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
              Attendees ({form.attendee_ids.length} selected)
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2" style={{ borderColor: 'var(--border)' }}>
              {contacts.map(c => {
                const cid = c._id?.toString() || c.id?.toString();
                const selected = form.attendee_ids.includes(cid);
                return (
                  <button
                    key={cid}
                    onClick={() => toggleAttendee(cid)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                    style={{ background: selected ? 'var(--orange-pale)' : 'transparent' }}
                  >
                    <Avatar user={c} size={7} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{c.role?.replace('_', ' ')}</p>
                    </div>
                    {selected && <CheckCheck size={16} style={{ color: 'var(--orange)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={createMeeting} disabled={saving}
            className="w-full py-3 rounded-lg font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: 'var(--orange)' }}
          >
            {saving ? 'Scheduling…' : 'Schedule Meeting'}
          </button>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Upcoming</p>
          <div className="space-y-3">
            {upcoming.map(m => {
              const isOrganizer = m.organizer_id?._id?.toString() === myId || m.organizer_id?.toString() === myId;
              return (
                <div key={m.id || m._id} className="card border-l-4" style={{ borderLeftColor: 'var(--orange)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{m.title}</p>
                      {m.description && <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{m.description}</p>}
                      <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={14} />
                        <span>{fmtMeeting(m.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <Users size={14} />
                        <span>{(m.attendee_ids?.length || 0) + 1} participants</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {m.attendee_ids?.slice(0, 5).map((a, i) => (
                          <Avatar key={i} user={a} size={7} />
                        ))}
                        {(m.attendee_ids?.length || 0) > 5 && (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>+{m.attendee_ids.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {m.link && (
                        <a href={m.link} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                          style={{ background: 'var(--success)' }}
                        >
                          <Video size={14} /> Join
                        </a>
                      )}
                      {isOrganizer && (
                        <button onClick={() => cancelMeeting(m.id || m._id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors hover:bg-red-50"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Past</p>
          <div className="space-y-2">
            {past.slice(0, 5).map(m => (
              <div key={m.id || m._id} className="card opacity-60">
                <p className="font-semibold text-sm">{m.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{fmtMeeting(m.start_time)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No meetings yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Schedule one to get started</p>
        </div>
      )}
    </div>
  );
}

// ── Main MessagesPage ─────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token) || localStorage.getItem('happen_token');

  const [tab, setTab] = useState(searchParams.get('tab') || 'messages');
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [search, setSearch] = useState('');
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Open specific contact from URL param ?contact=userId
  const contactParam = searchParams.get('contact');

  // Connect socket
  useEffect(() => {
    if (!token) return;
    const s = io(BACKEND, { auth: { token }, transports: ['websocket', 'polling'] });
    s.on('connect', () => setSocket(s));
    s.on('online_users', (ids) => setOnlineUsers(ids));
    s.on('connect_error', (e) => console.error('Socket error:', e.message));
    return () => s.disconnect();
  }, [token]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const res = await api.get('/messages/contacts');
      setContacts(res.data);

      // Auto-open contact from URL param
      if (contactParam) {
        const found = res.data.find(c =>
          (c._id?.toString() || c.id?.toString()) === contactParam
        );
        if (found) setActiveContact(found);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  }, [contactParam]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Refresh unread counts when new message arrives
  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchContacts();
    socket.on('new_message', handler);
    return () => socket.off('new_message', handler);
  }, [socket, fetchContacts]);

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
  }, [searchParams]);

  const switchTab = (t) => {
    setTab(t);
    setSearchParams(t === 'messages' ? {} : { tab: t });
  };

  const openContact = (contact) => {
    setActiveContact(contact);
    setTab('messages');
    setSearchParams({ contact: contact._id?.toString() || contact.id?.toString() });
  };

  const filtered = contacts.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.role?.toLowerCase().includes(search.toLowerCase()) ||
    c.team_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = contacts.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="flex h-full rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)', height: 'calc(100vh - 120px)' }}>

      {/* ── Left sidebar: contacts + tabs ── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r bg-white" style={{ borderColor: 'var(--border)' }}>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {[
            { key: 'messages', label: 'Messages', badge: totalUnread },
            { key: 'meetings', label: 'Meetings', badge: 0 },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className="flex-1 py-3.5 text-sm font-semibold relative transition-colors"
              style={{
                color: tab === t.key ? 'var(--orange)' : 'var(--text-secondary)',
                borderBottom: tab === t.key ? '2px solid var(--orange)' : '2px solid transparent',
              }}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: 'var(--orange)' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'messages' && (
          <>
            {/* Search */}
            <div className="p-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text" placeholder="Search people…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
                />
              </div>
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto">
              {loadingContacts ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--orange)' }} />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No contacts found</p>
              ) : (
                filtered.map(c => {
                  const cid = c._id?.toString() || c.id?.toString();
                  const isActive = (activeContact?._id?.toString() || activeContact?.id?.toString()) === cid;
                  const isOnline = onlineUsers.includes(cid);
                  const roleColor = ROLE_COLORS[c.role] || 'var(--orange)';

                  return (
                    <button
                      key={cid}
                      onClick={() => openContact(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                      style={{ background: isActive ? 'var(--orange-pale)' : 'transparent' }}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar user={c} size={10} color={roleColor} />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white" style={{ background: 'var(--success)' }} />
                        )}
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
                            {c.last_message ? c.last_message.text : `${c.role?.replace('_', ' ')} · ${c.team_name}`}
                          </p>
                          {c.unread_count > 0 && (
                            <span className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'var(--orange)' }}>
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {tab === 'meetings' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              Manage your meetings on the right →
            </p>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      {tab === 'messages' ? (
        <ChatPanel
          contact={activeContact}
          currentUser={user}
          socket={socket}
          onlineUsers={onlineUsers}
        />
      ) : (
        <div className="flex-1 overflow-hidden">
          <MeetingsTab currentUser={user} />
        </div>
      )}
    </div>
  );
}
