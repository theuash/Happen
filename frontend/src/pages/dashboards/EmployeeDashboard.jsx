import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';
import { TrendingUp, TrendingDown, Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

function EmployeeDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [queuePos, setQueuePos] = useState(null);
  const [activity, setActivity] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [managerLeaves, setManagerLeaves] = useState([]);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const handleEmergencyLeave = async () => {
    setEmergencyLoading(true);
    try {
      await api.post('/leave-requests', { type: 'emergency' });
      toast.success('Emergency leave granted. HR and your manager have been notified.');
      setShowEmergencyConfirm(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit emergency leave');
    } finally {
      setEmergencyLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [user?.id]);

  const fetchAll = async () => {
    try {
      const [balRes, qRes, actRes] = await Promise.all([
        api.get('/me/leave-balance'),
        api.get('/me/queue-position'),
        api.get('/me/activity'),
      ]);
      setBalance(balRes.data);
      setQueuePos(qRes.data);
      setActivity(actRes.data);

      if (user?.team_id) {
        const [wlRes, calRes] = await Promise.all([
          api.get(`/teams/${user.team_id}/workload`),
          api.get(`/teams/${user.team_id}/calendar`),
        ]);
        setWorkload(wlRes.data);
        setTeamLeaves(calRes.data.slice(0, 5));
      }

      const mgRes = await api.get('/manager-leave');
      const today = new Date().toISOString().split('T')[0];
      setManagerLeaves(mgRes.data.filter(l => l.end_date >= today).slice(0, 3));
    } catch (e) {
      console.error(e);
    }
  };

  const pct = workload?.workload_current ?? 0;
  const gaugeColor = pct >= 80 ? '#EF4444' : pct >= 50 ? '#F59E0B' : '#22C55E';
  const conicBg = `conic-gradient(${gaugeColor} ${pct * 3.6}deg, #E5E7EB ${pct * 3.6}deg)`;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const activityIcons = { 'login': '🔑', 'leave_request.created': '📋', 'leave_request.approved': '✅', 'leave_request.denied': '❌', 'password.reset': '🔒' };

  return (
    <div className="space-y-5">
      {/* Manager/HR leave banners */}
      {managerLeaves.map(l => (
        <div key={l.id} className="card border-l-4 flex items-center gap-4 py-3" style={{ borderLeftColor: '#8B5CF6', background: '#F5F3FF' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: '#8B5CF6' }}>
            {l.first_name?.charAt(0)}{l.last_name?.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#4C1D95' }}>
              {l.role === 'hr' ? 'HR' : 'Manager'} Leave Notice
            </p>
            <p className="text-sm" style={{ color: '#6D28D9' }}>
              <b>{l.first_name} {l.last_name}</b> on leave {new Date(l.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {new Date(l.end_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
            </p>
          </div>
        </div>
      ))}

      {/* Queue banner */}
      {queuePos?.position && (
        <div className="card border-l-4 flex items-center justify-between py-3" style={{ borderLeftColor: 'var(--orange)', background: 'var(--orange-pale)' }}>
          <div className="flex items-center gap-3">
            <Clock size={22} style={{ color: 'var(--orange)' }} />
            <div>
              <p className="font-semibold">You're #{queuePos.position} in the leave queue</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Est. approval: {new Date(queuePos.estimated_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/leave/queue')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--orange)' }}>
            View Queue
          </button>
        </div>
      )}

      {/* 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT — Leave Balances */}
        <div className="card space-y-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Leave Balances</h3>

          {balance ? (
            <>
              {[
                { label: 'Annual', value: balance.annual, total: 20, color: 'var(--orange)' },
                { label: 'Sick', value: balance.sick, total: 10, color: 'var(--success)' },
                { label: 'Wellness', value: 2 - (balance.wellness_used ?? 0), total: 2, color: '#8B5CF6' },
                { label: 'Emergency', value: 3 - (balance.emergency_used ?? 0), total: 3, color: '#DC2626' },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="font-bold" style={{ color }}>{value} <span className="text-xs font-normal text-gray-400">/ {total} days</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-500" style={{ background: color, width: `${Math.max(0,(value/total)*100)}%` }} />
                  </div>
                </div>
              ))}

              <div className="pt-2 space-y-2">
                <button onClick={() => navigate('/leave/request')} className="w-full py-2.5 rounded-lg font-semibold text-white text-sm hover:-translate-y-0.5 transition-all" style={{ background: 'var(--orange)' }}>
                  Request Leave
                </button>
                <button
                  onClick={() => setShowEmergencyConfirm(true)}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm text-white hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  style={{ background: '#DC2626' }}
                >
                  <AlertTriangle size={16} />
                  Emergency Leave
                </button>
                <button onClick={() => navigate('/calendar')} className="w-full py-2.5 rounded-lg font-semibold text-sm border-2 hover:-translate-y-0.5 transition-all" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}>
                  My Calendar
                </button>
              </div>

              {/* Emergency Confirmation Modal */}
              {showEmergencyConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowEmergencyConfirm(false)}>
                  <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF2F2' }}>
                      <AlertTriangle size={32} style={{ color: '#DC2626' }} />
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Emergency Leave</h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                      This will immediately notify your <strong>HR team</strong> and <strong>manager</strong>. No dates or description needed. Proof may be required within 24 hours.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowEmergencyConfirm(false)}
                        className="flex-1 py-3 rounded-lg font-semibold border-2"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEmergencyLeave}
                        disabled={emergencyLoading}
                        className="flex-1 py-3 rounded-lg font-semibold text-white disabled:opacity-50"
                        style={{ background: '#DC2626' }}
                      >
                        {emergencyLoading ? 'Sending…' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="shimmer h-8 rounded" />)}</div>
          )}
        </div>

        {/* MIDDLE — Team Workload */}
        <div className="card space-y-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Team Workload</h3>

          {workload ? (
            <>
              <div className="relative w-40 h-40 mx-auto">
                <div className="w-full h-full rounded-full" style={{ background: conicBg }}>
                  <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold" style={{ color: gaugeColor }}>{pct}%</span>
                    <div className="flex items-center gap-1 mt-1">
                      {pct > 50 ? <TrendingUp size={14} style={{ color: '#EF4444' }} /> : <TrendingDown size={14} style={{ color: '#22C55E' }} />}
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pct >= 80 ? 'High' : pct >= 50 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>On Leave This Month</p>
                {workload.upcoming_deadlines?.length > 0 ? (
                  workload.upcoming_deadlines.map((d, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm" style={{ borderColor: 'var(--border)' }}>
                      <span>{d.first_name} {d.last_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>
                        {new Date(d.start_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>No upcoming leaves</p>
                )}
              </div>
            </>
          ) : (
            <div className="shimmer h-48 rounded" />
          )}
        </div>

        {/* RIGHT — Mini Calendar + Events */}
        <div className="card space-y-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {today.toLocaleString('default',{month:'long',year:'numeric'})}
          </h3>

          {/* Mini calendar */}
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} className="py-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>{d}</div>
            ))}
            {Array.from({length: firstDay}).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({length: daysInMonth}).map((_,i) => {
              const d = i + 1;
              const isToday = d === today.getDate();
              return (
                <div key={d} className="py-1 rounded font-medium" style={{
                  background: isToday ? 'var(--orange)' : 'transparent',
                  color: isToday ? 'white' : 'var(--text-primary)',
                }}>
                  {d}
                </div>
              );
            })}
          </div>

          {/* Today's team leaves */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Team on Leave</p>
            {teamLeaves.length > 0 ? teamLeaves.slice(0,4).map((l,i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--orange)' }}>
                  {l.first_name?.charAt(0)}
                </div>
                <span className="text-sm flex-1">{l.first_name} {l.last_name}</span>
                <span className="text-xs capitalize px-1.5 py-0.5 rounded" style={{ background: 'var(--orange-pale)', color: 'var(--orange)' }}>{l.type}</span>
              </div>
            )) : (
              <p className="text-sm text-center py-3" style={{ color: 'var(--text-secondary)' }}>Everyone's in today</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
        {activity.length > 0 ? (
          <div className="space-y-3">
            {activity.slice(0,5).map((item, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: 'var(--orange-pale)' }}>
                    {activityIcons[item.action] || '📌'}
                  </div>
                  {i < 4 && <div className="absolute left-1/2 -translate-x-1/2 top-8 w-0.5 h-6" style={{ background: 'var(--border)' }} />}
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                    {item.action?.replace(/_/g,' ').replace(/\./g,' — ')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.details}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(item.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No recent activity</p>
        )}
      </div>
    </div>
  );
}

export default EmployeeDashboard;
