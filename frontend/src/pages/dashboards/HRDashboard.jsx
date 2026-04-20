import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { AlertTriangle, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import ScheduleLeavePanel from '../../components/ScheduleLeavePanel';

function HRDashboard() {
  const [emergencyLeaves, setEmergencyLeaves] = useState([]);
  const [biasFlags, setBiasFlags] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const leavesRes = await api.get('/leave-requests/all');
      setEmergencyLeaves(leavesRes.data.filter(l => l.type === 'emergency' && !l.proof_verified));
      setBiasFlags([
        { id: 1, employee: 'Sarah Chen', issue: 'Denied 3 consecutive requests', severity: 'high', date: '2026-04-15' },
        { id: 2, employee: 'James Wu', issue: 'Longer approval time vs peers', severity: 'medium', date: '2026-04-12' },
      ]);
      setAppeals([
        { id: 1, employee: 'Diana Martinez', request_date: '2026-03-20', appeal_date: '2026-04-10', status: 'pending' },
      ]);
    } catch (error) {
      console.error('Error fetching HR data:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSelectedEmployee({
      name: searchQuery,
      email: `${searchQuery.toLowerCase().replace(' ', '.')}@company.com`,
      team: 'Engineering',
      leave_balance: { annual: 12, sick: 8 },
      recent_requests: [
        { date: '2026-03-15', type: 'annual', days: 3, status: 'approved' },
        { date: '2026-02-10', type: 'sick', days: 1, status: 'approved' },
      ],
    });
  };

  return (
    <div className="space-y-6" data-testid="hr-dashboard">

      {/* Top row: Schedule Leave + Alert Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScheduleLeavePanel />

        <div className="lg:col-span-2 space-y-4">
          {emergencyLeaves.length > 0 && (
            <div className="card border-l-4" style={{ borderLeftColor: '#DC2626', background: '#FEF2F2' }}>
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} style={{ color: '#DC2626' }} />
                <div>
                  <p className="font-bold" style={{ color: '#DC2626' }}>
                    {emergencyLeaves.length} Emergency Leave Proof(s) Expiring Soon
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Review and verify submitted documentation
                  </p>
                </div>
              </div>
            </div>
          )}

          {biasFlags.length > 0 && (
            <div className="card border-l-4" style={{ borderLeftColor: '#F59E0B', background: '#FFF7ED' }}>
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} style={{ color: '#F59E0B' }} />
                <div>
                  <p className="font-bold" style={{ color: '#F59E0B' }}>
                    {biasFlags.length} Potential Bias Flag(s) Detected
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Review patterns that may indicate unfair treatment
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Search */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Employee Search
            </h3>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'var(--orange)' }}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emergency Leave Review */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Emergency Leave Review</h3>
          <div className="space-y-3">
            {emergencyLeaves.map((leave) => (
              <div key={leave.id} className="p-3 rounded-lg border hover:shadow-md transition-all duration-200 cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{leave.first_name} {leave.last_name}</p>
                  <span className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ background: leave.proof_submitted ? '#F59E0B' : '#DC2626' }}>
                    {leave.proof_submitted ? 'Pending Review' : 'No Proof'}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(leave.start_date).toLocaleDateString()} – {new Date(leave.end_date).toLocaleDateString()}
                </p>
                {leave.proof_deadline && (
                  <p className="text-xs mt-1" style={{ color: '#DC2626' }}>
                    Deadline: {new Date(leave.proof_deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
            {emergencyLeaves.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No pending emergency reviews</p>
            )}
          </div>
        </div>

        {/* Bias Detection */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Bias Detection</h3>
          <div className="space-y-3">
            {biasFlags.map((flag) => (
              <div key={flag.id} className="p-3 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer" style={{ borderLeft: `4px solid ${flag.severity === 'high' ? '#DC2626' : '#F59E0B'}`, paddingLeft: '12px' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{flag.employee}</p>
                  <span className="px-2 py-1 rounded text-xs font-semibold text-white capitalize" style={{ background: flag.severity === 'high' ? '#DC2626' : '#F59E0B' }}>
                    {flag.severity}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{flag.issue}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Detected: {new Date(flag.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Appeals Queue */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Appeals Queue</h3>
          <div className="space-y-3">
            {appeals.map((appeal) => (
              <div key={appeal.id} className="p-3 rounded-lg border hover:shadow-md transition-all duration-200 cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{appeal.employee}</p>
                  <span className="px-2 py-1 rounded text-xs font-semibold text-white capitalize" style={{ background: 'var(--warning)' }}>
                    {appeal.status}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Original: {new Date(appeal.request_date).toLocaleDateString()}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Appealed: {new Date(appeal.appeal_date).toLocaleDateString()}</p>
              </div>
            ))}
            {appeals.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>No pending appeals</p>
            )}
          </div>
        </div>
      </div>

      {/* Employee Profile Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50" onClick={() => setSelectedEmployee(null)}>
          <div className="bg-white h-full w-full max-w-md p-8 overflow-y-auto animate-slideIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Employee Profile</h3>
              <button onClick={() => setSelectedEmployee(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Name</p>
                <p className="text-lg font-semibold">{selectedEmployee.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Email</p>
                <p>{selectedEmployee.email}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Leave Balance</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--orange-pale)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{selectedEmployee.leave_balance.annual}</p>
                    <p className="text-sm">Annual</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: '#F0FDF4' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{selectedEmployee.leave_balance.sick}</p>
                    <p className="text-sm">Sick</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Recent Requests</p>
                <div className="space-y-2">
                  {selectedEmployee.recent_requests.map((req, idx) => (
                    <div key={idx} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between items-center">
                        <span className="capitalize font-medium">{req.type}</span>
                        <span className="px-2 py-1 rounded text-xs font-semibold text-white" style={{ background: 'var(--success)' }}>{req.status}</span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{req.date} • {req.days} days</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HRDashboard;
