import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';
import { Clock, TrendingUp } from 'lucide-react';

function EmployeeDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, workloadRes, queueRes, activityRes] = await Promise.all([
        api.get('/me/leave-balance'),
        api.get(`/teams/${user.team_id}/workload`),
        api.get('/me/queue-position'),
        api.get('/me/activity'),
      ]);
      setLeaveBalance(balanceRes.data);
      setWorkload(workloadRes.data);
      setQueuePosition(queueRes.data);
      setActivity(activityRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const CircularProgress = ({ value, total, label, color }) => {
    const percentage = (value / total) * 100;
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="transform -rotate-90" width="96" height="96">
            <circle cx="48" cy="48" r="40" stroke="#E5E7EB" strokeWidth="8" fill="none" />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl font-bold" style={{ color }}>
              {total - value}
            </span>
          </div>
        </div>
        <span className="text-sm font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="employee-dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 - Leave Balance */}
        <div className="card space-y-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Leave Balance
          </h3>
          {leaveBalance ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <CircularProgress
                  value={leaveBalance.annual.used}
                  total={leaveBalance.annual.total}
                  label="Annual"
                  color="var(--orange)"
                />
                <CircularProgress
                  value={leaveBalance.sick.used}
                  total={leaveBalance.sick.total}
                  label="Sick"
                  color="var(--success)"
                />
                <CircularProgress
                  value={leaveBalance.wellness.used}
                  total={leaveBalance.wellness.total}
                  label="Wellness"
                  color="var(--warning)"
                />
                <CircularProgress
                  value={leaveBalance.emergency.used}
                  total={leaveBalance.emergency.total}
                  label="Emergency"
                  color="var(--danger)"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => navigate('/leave/request')}
                  className="flex-1 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{ background: 'var(--orange)' }}
                  data-testid="request-leave-button"
                >
                  Request Leave
                </button>
                <button
                  onClick={() => navigate('/leave/request?emergency=true')}
                  className="flex-1 py-2 rounded-lg font-medium border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
                  data-testid="emergency-leave-button"
                >
                  Emergency
                </button>
              </div>
            </>
          ) : (
            <div className="shimmer h-48 rounded"></div>
          )}
        </div>

        {/* Column 2 - Workload & Queue */}
        <div className="space-y-6">
          {/* Team Workload */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Team Workload
            </h3>
            {workload ? (
              <>
                <div className="relative w-40 h-40 mx-auto">
                  <svg className="transform -rotate-90" width="160" height="160">
                    <circle cx="80" cy="80" r="60" stroke="#E5E7EB" strokeWidth="12" fill="none" />
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      stroke={
                        workload.percentage > 80
                          ? 'var(--danger)'
                          : workload.percentage > 50
                          ? 'var(--warning)'
                          : 'var(--success)'
                      }
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - workload.percentage / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {workload.percentage}%
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp size={14} style={{ color: 'var(--success)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {workload.trend}
                      </span>
                    </div>
                  </div>
                </div>
                {workload.deadlines?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Upcoming Deadlines:
                    </p>
                    {workload.deadlines.map((deadline, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{deadline.title}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{deadline.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="shimmer h-40 rounded"></div>
            )}
          </div>

          {/* Queue Status */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Queue Status
            </h3>
            {queuePosition ? (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4"
                  style={{ background: 'var(--orange)' }}
                >
                  #{queuePosition.position}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      background: 'var(--orange)',
                      width: `${(queuePosition.position / queuePosition.total) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Estimated approval: <span className="font-semibold">{queuePosition.estimated_approval}</span>
                </p>
              </>
            ) : (
              <div className="shimmer h-32 rounded"></div>
            )}
          </div>
        </div>

        {/* Column 3 - Activity Feed */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Recent Activity
          </h3>
          {activity.length > 0 ? (
            <div className="space-y-4">
              {activity.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="relative">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: 'var(--orange)' }}
                    ></div>
                    {idx < activity.length - 1 && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 top-3 w-0.5 h-12"
                        style={{ background: 'var(--border)' }}
                      ></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.description}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboard;
