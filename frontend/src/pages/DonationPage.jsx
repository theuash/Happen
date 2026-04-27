import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import {
  Gift, Users, Droplets, Clock, CheckCircle,
  ArrowRight, Plus, X, Heart,
} from 'lucide-react';

const ROLE_COLORS = {
  admin: '#7C3AED', manager: '#F59E0B', hr: '#EC4899',
  team_lead: '#0EA5E9', accounting: '#22C55E', employee: '#F4631E',
};

function Avatar({ u, size = 36 }) {
  const bg = ROLE_COLORS[u?.role] || 'var(--orange)';
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.33 }}
    >
      {u?.first_name?.charAt(0)}{u?.last_name?.charAt(0)}
    </div>
  );
}

// ── Donate Modal ──────────────────────────────────────────────────────────────
function DonateModal({ contacts, balance, onDone, onClose }) {
  const [mode, setMode] = useState('direct'); // direct | pool
  const [recipientId, setRecipientId] = useState('');
  const [days, setDays] = useState(1);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (days < 1 || days > Math.min(10, balance)) {
      toast.error(`Days must be between 1 and ${Math.min(10, balance)}`);
      return;
    }
    if (mode === 'direct' && !recipientId) {
      toast.error('Please select a recipient');
      return;
    }
    setSaving(true);
    try {
      const payload = mode === 'pool'
        ? { is_pool: true, days, message }
        : { recipient_id: recipientId, days, message };
      const res = await api.post('/donations', payload);
      toast.success(res.data.message);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to donate');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Donate Leave Days</h3>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setMode('direct')}
            className="p-4 rounded-xl border-2 text-left transition-all"
            style={{ borderColor: mode === 'direct' ? 'var(--orange)' : 'var(--border)', background: mode === 'direct' ? 'var(--orange-pale)' : 'white' }}
          >
            <Users size={20} style={{ color: mode === 'direct' ? 'var(--orange)' : 'var(--text-secondary)' }} className="mb-2" />
            <p className="font-bold text-sm" style={{ color: mode === 'direct' ? 'var(--orange)' : 'var(--text-primary)' }}>Direct Gift</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Send to a specific person</p>
          </button>
          <button
            onClick={() => setMode('pool')}
            className="p-4 rounded-xl border-2 text-left transition-all"
            style={{ borderColor: mode === 'pool' ? '#8B5CF6' : 'var(--border)', background: mode === 'pool' ? '#F5F3FF' : 'white' }}
          >
            <Droplets size={20} style={{ color: mode === 'pool' ? '#8B5CF6' : 'var(--text-secondary)' }} className="mb-2" />
            <p className="font-bold text-sm" style={{ color: mode === 'pool' ? '#8B5CF6' : 'var(--text-primary)' }}>Leave Pool</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Anyone can claim (FCFS)</p>
          </button>
        </div>

        {/* Recipient (direct only) */}
        {mode === 'direct' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Recipient *</label>
            <select
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
            >
              <option value="">Select a colleague…</option>
              {contacts.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.first_name} {c.last_name} — {c.role?.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Days */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Days to Donate
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
              (you have {balance} remaining, max 10 per donation)
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDays(d => Math.max(1, d - 1))}
              className="w-10 h-10 rounded-xl border-2 font-bold text-lg flex items-center justify-center transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--border)' }}
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-4xl font-bold" style={{ color: 'var(--orange)' }}>{days}</span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>day{days !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setDays(d => Math.min(Math.min(10, balance), d + 1))}
              className="w-10 h-10 rounded-xl border-2 font-bold text-lg flex items-center justify-center transition-all hover:bg-gray-50"
              style={{ borderColor: 'var(--border)' }}
            >+</button>
          </div>
          {/* Quick select */}
          <div className="flex gap-2 mt-2 justify-center">
            {[1, 2, 3, 5].filter(n => n <= Math.min(10, balance)).map(n => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{ background: days === n ? 'var(--orange)' : '#F3F4F6', color: days === n ? 'white' : 'var(--text-secondary)' }}
              >
                {n}d
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Message <span className="font-normal" style={{ color: 'var(--text-secondary)' }}>(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            placeholder={mode === 'pool' ? 'e.g. Hope this helps someone who needs it!' : 'e.g. Get well soon! Take the time you need.'}
            className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || days < 1 || days > balance}
            className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: mode === 'pool' ? '#8B5CF6' : 'var(--orange)' }}
          >
            <Gift size={18} />
            {saving ? 'Donating…' : mode === 'pool' ? 'Add to Pool' : 'Send Gift'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DonationPage() {
  const user = useAuthStore(s => s.user);
  const myId = user?._id || user?.id;
  const [balance, setBalance] = useState(user?.leave_balance_annual ?? 20);
  const [pool, setPool] = useState([]);
  const [history, setHistory] = useState({ sent: [], received: [], claimed: [] });
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [activeTab, setActiveTab] = useState('pool');

  const fetchAll = useCallback(async () => {
    try {
      const [poolRes, histRes, contactsRes, balRes] = await Promise.all([
        api.get('/donations/pool'),
        api.get('/donations/history'),
        api.get('/messages/contacts'),
        api.get('/me/leave-balance'),
      ]);
      setPool(poolRes.data);
      setHistory(histRes.data);
      setContacts(contactsRes.data.filter(c => (c._id || c.id)?.toString() !== myId?.toString()));
      setBalance(balRes.data.annual);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [myId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const claimPool = async (donationId) => {
    setClaiming(donationId);
    try {
      const res = await api.post(`/donations/${donationId}/claim`);
      toast.success(res.data.message);
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to claim');
    } finally { setClaiming(null); }
  };

  const totalReceived = history.received.reduce((s, d) => s + d.days, 0);
  const totalSent     = history.sent.reduce((s, d) => s + d.days, 0);
  const totalClaimed  = history.claimed.reduce((s, d) => s + d.days, 0);
  const poolDays      = pool.reduce((s, d) => s + d.days, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Leave Donation</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Gift your unused leave days to colleagues or drop them in the shared pool
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={balance < 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--orange)' }}
        >
          <Gift size={18} /> Donate Days
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold" style={{ color: 'var(--orange)' }}>{balance}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Your Balance</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold" style={{ color: '#8B5CF6' }}>{poolDays}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Days in Pool</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>{totalReceived + totalClaimed}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Days Received</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold" style={{ color: 'var(--text-secondary)' }}>{totalSent}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Days Donated</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { k: 'pool',    l: `Leave Pool (${pool.length})` },
          { k: 'history', l: 'My History' },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className="px-5 py-3 font-semibold text-sm transition-colors"
            style={{
              color: activeTab === t.k ? 'var(--orange)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.k ? '2px solid var(--orange)' : '2px solid transparent',
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Pool tab */}
      {activeTab === 'pool' && (
        <div className="space-y-4">
          <div className="card flex items-start gap-3" style={{ background: '#F5F3FF', borderLeft: '4px solid #8B5CF6' }}>
            <Droplets size={20} style={{ color: '#8B5CF6', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#4C1D95' }}>First Come, First Served</p>
              <p className="text-xs mt-0.5" style={{ color: '#6D28D9' }}>
                Anyone can claim pool donations. The oldest donation is always at the top — claim it before someone else does!
              </p>
            </div>
          </div>

          {pool.length === 0 ? (
            <div className="card text-center py-16">
              <Droplets size={48} className="mx-auto mb-4" style={{ color: 'var(--border)' }} />
              <p className="font-semibold text-lg" style={{ color: 'var(--text-secondary)' }}>Pool is empty</p>
              <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>Be the first to add days to the shared pool!</p>
              <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-xl font-bold text-white" style={{ background: '#8B5CF6' }}>
                Donate to Pool
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pool.map((d, i) => {
                const isFirst = i === 0;
                return (
                  <div
                    key={d._id || d.id}
                    className="card flex items-center gap-4 transition-all hover:shadow-md"
                    style={{ borderLeft: `4px solid ${isFirst ? '#8B5CF6' : 'var(--border)'}`, background: isFirst ? '#F5F3FF' : 'white' }}
                  >
                    {/* Position badge */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: isFirst ? '#8B5CF6' : '#F3F4F6', color: isFirst ? 'white' : 'var(--text-secondary)' }}
                    >
                      {i + 1}
                    </div>

                    <Avatar u={d.donor_id} size={40} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{d.donor_id?.first_name} {d.donor_id?.last_name}</span>
                        {isFirst && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>
                            Next up
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Added {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      {d.message && (
                        <p className="text-xs mt-1 italic" style={{ color: 'var(--text-secondary)' }}>"{d.message}"</p>
                      )}
                    </div>

                    {/* Days badge */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>{d.days}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>day{d.days !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Claim button */}
                    <button
                      onClick={() => claimPool(d._id || d.id)}
                      disabled={claiming === (d._id || d.id) || (d.donor_id?._id || d.donor_id)?.toString() === myId?.toString()}
                      className="px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                      style={{ background: '#8B5CF6' }}
                      title={(d.donor_id?._id || d.donor_id)?.toString() === myId?.toString() ? "You can't claim your own donation" : ''}
                    >
                      {claiming === (d._id || d.id) ? 'Claiming…' : 'Claim'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Received */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
              Received ({history.received.length + history.claimed.length})
            </p>
            {[...history.received, ...history.claimed].length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>No donations received yet</p>
            ) : (
              <div className="space-y-2">
                {[...history.received, ...history.claimed].map((d, i) => (
                  <div key={d._id || d.id || i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#F0FDF4' }}>
                    <Avatar u={d.donor_id} size={36} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{d.donor_id?.first_name} {d.donor_id?.last_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {d.is_pool ? 'From pool' : 'Direct gift'} · {new Date(d.createdAt || d.claimed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      {d.message && <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-secondary)' }}>"{d.message}"</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold" style={{ color: 'var(--success)' }}>+{d.days}d</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
              Donated ({history.sent.length})
            </p>
            {history.sent.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>You haven't donated any days yet</p>
            ) : (
              <div className="space-y-2">
                {history.sent.map((d, i) => (
                  <div key={d._id || d.id || i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--page-bg)' }}>
                    {d.is_pool ? (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F5F3FF' }}>
                        <Droplets size={18} style={{ color: '#8B5CF6' }} />
                      </div>
                    ) : (
                      <Avatar u={d.recipient_id} size={36} />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {d.is_pool ? 'Donated to pool' : `To ${d.recipient_id?.first_name} ${d.recipient_id?.last_name}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        {d.is_pool && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{
                              background: d.status === 'pool_claimed' ? '#F0FDF4' : '#F5F3FF',
                              color: d.status === 'pool_claimed' ? 'var(--success)' : '#8B5CF6',
                            }}
                          >
                            {d.status === 'pool_claimed'
                              ? `Claimed by ${d.claimed_by?.first_name || 'someone'}`
                              : 'Available in pool'}
                          </span>
                        )}
                      </div>
                      {d.message && <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-secondary)' }}>"{d.message}"</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>−{d.days}d</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Donate Modal */}
      {showModal && (
        <DonateModal
          contacts={contacts}
          balance={balance}
          onDone={fetchAll}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
