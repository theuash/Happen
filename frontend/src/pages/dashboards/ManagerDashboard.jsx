import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ScheduleLeavePanel from '../../components/ScheduleLeavePanel';

function ManagerDashboard() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [burnoutRisk, setBurnoutRisk] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workloadRes, burnoutRes, overridesRes] = await Promise.all([
        api.get('/company/workload'),
        api.get('/company/burnout-risk'),
        api.get('/company/overrides'),
      ]);

      setTeams(workloadRes.data);
      setBurnoutRisk(burnoutRes.data);
      setOverrides(overridesRes.data);
    } catch (error) {
      console.error('Error fetching manager data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColor = (workload) => {
    if (workload >= 80) return '#EF4444';
    if (workload >= 50) return '#F59E0B';
    return '#22C55E';
  };

  const WorkloadGauge = ({ percentage, teamName }) => {
    const conicGradient = `conic-gradient(
      ${getWorkloadColor(percentage)} ${percentage * 3.6}deg,
      #E5E7EB ${percentage * 3.6}deg
    )`;

    return (
      <div className="card hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={() => navigate('/analytics')}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {teamName}
          </h4>
          <Users size={18} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div className="relative w-32 h-32 mx-auto">
          <div
            className="w-full h-full rounded-full"
            style={{ background: conicGradient }}
          >
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center flex-col">
              <span className="text-2xl font-bold" style={{ color: getWorkloadColor(percentage) }}>
                {percentage}%
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                workload
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--orange)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-dashboard">
      {/* Schedule Leave + Company Workload side by side at top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScheduleLeavePanel />

        {/* Company Workload Overview */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {teams.map((team) => (
            <WorkloadGauge
              key={team.id}
              percentage={team.workload_current}
              teamName={team.name}
            />
          ))}
        </div>
      </div>

      {/* Burnout Risk Alerts */}
      {burnoutRisk.length > 0 && (
        <div
          className="card border-l-4"
          style={{ borderLeftColor: '#F59E0B', background: '#FFF7ED' }}
        >
          <div className="flex items-start gap-4">
            <AlertTriangle size={32} style={{ color: '#F59E0B' }} />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2" style={{ color: '#F59E0B' }}>
                Burnout Risk Alerts
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {burnoutRisk.length} employee(s) haven't taken leave in over 45 days
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {burnoutRisk.map((employee, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-lg border-l-4"
                    style={{ borderLeftColor: '#F59E0B' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{employee.first_name} {employee.last_name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {employee.team_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                          {employee.last_leave_end ? Math.floor((new Date() - new Date(employee.last_leave_end)) / (1000 * 60 * 60 * 24)) : '45+'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          days
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Patterns Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Override Patterns (Last 30 Days)
          </h3>
          <button
            onClick={() => navigate('/admin/audit')}
            className="text-sm font-medium"
            style={{ color: 'var(--orange)' }}
          >
            View All →
          </button>
        </div>

        {overrides.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Manager
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Employee
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Decision
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Reason
                  </th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {overrides.slice(0, 5).map((override, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-orange-50 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium">{override.manager_first} {override.manager_last}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {override.manager_email}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{override.employee_first} {override.employee_last}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                        style={{
                          background: override.decision === 'approved' ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {override.decision}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm truncate max-w-xs">{override.reason}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm">
                        {new Date(override.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            No overrides in the last 30 days
          </p>
        )}
      </div>

      {/* All-Teams Deadline Timeline */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Upcoming Leave Timeline
          </h3>
          <button
            onClick={() => navigate('/calendar')}
            className="text-sm font-medium"
            style={{ color: 'var(--orange)' }}
          >
            View Calendar →
          </button>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: 'var(--border)' }}></div>
          <div className="space-y-4 pl-12">
            {teams.flatMap(team => 
              (team.upcoming_leaves || []).map((leave, idx) => (
                <div key={`${team.id}-${idx}`} className="relative">
                  <div
                    className="absolute -left-[34px] w-3 h-3 rounded-full"
                    style={{ background: 'var(--orange)' }}
                  ></div>
                  <div className="p-4 rounded-lg border hover:shadow-md transition-all duration-200" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{leave.employee_name}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {team.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{leave.dates}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {leave.days} days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {teams.every(team => !team.upcoming_leaves || team.upcoming_leaves.length === 0) && (
              <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                No upcoming leaves scheduled
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManagerDashboard;
