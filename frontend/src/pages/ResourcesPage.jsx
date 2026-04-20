import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { toast } from 'sonner';
import { Plus, X, Monitor, Car, FlaskConical, DoorOpen, Package, Clock, Trash2 } from 'lucide-react';

const TYPE_CONFIG = {
  room:      { label: 'Room',      icon: DoorOpen,    color: '#3B82F6', bg: '#EFF6FF' },
  equipment: { label: 'Equipment', icon: Monitor,     color: '#8B5CF6', bg: '#F5F3FF' },
  lab:       { label: 'Lab',       color: '#22C55E', bg: '#F0FDF4', icon: FlaskConical },
  vehicle:   { label: 'Vehicle',   icon: Car,         color: '#F59E0B', bg: '#FFF7ED' },
  other:     { label: 'Other',     icon: Package,     color: '#6B7280', bg: '#F9FAFB' },
};

const fmt = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function ResourcesPage() {
  const user = useAuthStore(s => s.user);
  const myId = user?._id || user?.id;
  const canCreate = ['admin','manager','hr'].includes(user?.role);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingFor, setBookingFor] = useState(null);
  const [bookForm, setBookForm] = useState({ title: '', start_time: '', end_time: '', notes: '' });
  const [newResource, setNewResource] = useState({ name: '', type: 'room', capacity: 1, location: '' });
  const [showNewResource, setShowNewResource] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');

  const fetch = useCallback(async () => {
    try { const res = await api.get('/resources'); setResources(res.data); }
    catch { toast.error('Failed to load resources'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const book = async () => {
    if (!bookForm.title || !bookForm.start_time || !bookForm.end_time) { toast.error('All fields required'); return; }
    setSaving(true);
    try {
      const res = await api.post(`/resources/${bookingFor}/book`, bookForm);
      setResources(p => p.map(r => (r._id || r.id) === bookingFor ? { ...res.data, id: res.data._id } : r));
      setBookingFor(null); setBookForm({ title: '', start_time: '', end_time: '', notes: '' });
      toast.success('Booked!');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to book'); }
    finally { setSaving(false); }
  };

  const cancelBooking = async (resourceId, bookingId) => {
    try {
      await api.delete(`/resources/${resourceId}/bookings/${bookingId}`);
      setResources(p => p.map(r => (r._id || r.id) === resourceId ? { ...r, bookings: r.bookings.filter(b => (b._id || b.id) !== bookingId) } : r));
      toast.success('Booking cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  const createResource = async () => {
    if (!newResource.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const res = await api.post('/resources', newResource);
      setResources(p => [...p, { ...res.data, id: res.data._id }]);
      setShowNewResource(false); setNewResource({ name: '', type: 'room', capacity: 1, location: '' });
      toast.success('Resource added!');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = filterType ? resources.filter(r => r.type === filterType) : resources;

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Resource Scheduling</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Book rooms, equipment, vehicles, and lab space</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowNewResource(v => !v)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white" style={{ background: 'var(--orange)' }}>
            <Plus size={18} /> Add Resource
          </button>
        )}
      </div>

      {showNewResource && (
        <div className="card border-2 space-y-3" style={{ borderColor: 'var(--orange)' }}>
          <div className="flex items-center justify-between"><h3 className="font-bold">New Resource</h3><button onClick={() => setShowNewResource(false)}><X size={20} /></button></div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Resource name *" value={newResource.name} onChange={e => setNewResource(f => ({ ...f, name: e.target.value }))} className="col-span-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
            <select value={newResource.type} onChange={e => setNewResource(f => ({ ...f, type: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }}>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input type="number" placeholder="Capacity" value={newResource.capacity} onChange={e => setNewResource(f => ({ ...f, capacity: parseInt(e.target.value) }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
            <input type="text" placeholder="Location" value={newResource.location} onChange={e => setNewResource(f => ({ ...f, location: e.target.value }))} className="col-span-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNewResource(false)} className="flex-1 py-2 rounded-lg border font-semibold text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={createResource} disabled={saving} className="flex-1 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50" style={{ background: 'var(--orange)' }}>{saving ? 'Adding…' : 'Add Resource'}</button>
          </div>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ k: '', l: 'All' }, ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ k, l: v.label }))].map(f => (
          <button key={f.k} onClick={() => setFilterType(f.k)} className="px-3 py-2 rounded-lg text-sm font-semibold transition-all" style={{ background: filterType === f.k ? 'var(--orange)' : 'white', color: filterType === f.k ? 'white' : 'var(--text-primary)', border: `2px solid ${filterType === f.k ? 'var(--orange)' : 'var(--border)'}` }}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(resource => {
          const rid = resource._id || resource.id;
          const tc = TYPE_CONFIG[resource.type] || TYPE_CONFIG.other;
          const Icon = tc.icon;
          const todayBookings = resource.bookings?.filter(b => new Date(b.start_time).toISOString().split('T')[0] === today) || [];
          const isBooked = todayBookings.some(b => { const now = new Date(); return new Date(b.start_time) <= now && new Date(b.end_time) >= now; });

          return (
            <div key={rid} className="card space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                    <Icon size={24} style={{ color: tc.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold">{resource.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {tc.label} · Cap: {resource.capacity} · {resource.location}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold text-white" style={{ background: isBooked ? '#DC2626' : '#22C55E' }}>
                  {isBooked ? 'In Use' : 'Available'}
                </span>
              </div>

              {/* Today's bookings */}
              {todayBookings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Today's Schedule</p>
                  <div className="space-y-1">
                    {todayBookings.map((b, i) => {
                      const isMe = (b.booked_by?._id || b.booked_by)?.toString() === myId?.toString();
                      return (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: 'var(--page-bg)' }}>
                          <div>
                            <span className="font-semibold">{b.title}</span>
                            <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>{fmt(b.start_time)} – {fmt(b.end_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ color: 'var(--text-secondary)' }}>{b.booked_by?.first_name}</span>
                            {isMe && <button onClick={() => cancelBooking(rid, b._id || b.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={() => setBookingFor(bookingFor === rid ? null : rid)} className="w-full py-2 rounded-lg font-semibold text-sm border-2 transition-all hover:-translate-y-0.5" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}>
                {bookingFor === rid ? 'Cancel' : '+ Book Now'}
              </button>

              {bookingFor === rid && (
                <div className="space-y-2 p-3 rounded-xl" style={{ background: 'var(--orange-pale)' }}>
                  <input type="text" placeholder="Booking title *" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>Start</label>
                      <input type="datetime-local" value={bookForm.start_time} onChange={e => setBookForm(f => ({ ...f, start_time: e.target.value }))} className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>End</label>
                      <input type="datetime-local" value={bookForm.end_time} onChange={e => setBookForm(f => ({ ...f, end_time: e.target.value }))} className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)' }} />
                    </div>
                  </div>
                  <input type="text" placeholder="Notes (optional)" value={bookForm.notes} onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} />
                  <button onClick={book} disabled={saving} className="w-full py-2 rounded-lg font-bold text-white text-sm disabled:opacity-50" style={{ background: 'var(--orange)' }}>{saving ? 'Booking…' : 'Confirm Booking'}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
