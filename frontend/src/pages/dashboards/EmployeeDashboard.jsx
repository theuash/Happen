import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';
import { Calendar, TrendingUp, TrendingDown, Clock, Users, Video } from 'lucide-react';
import { toast } from 'sonner';

function EmployeeDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [activity, setActivity] = useState([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [managerLeaves, setManagerLeaves] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, queueRes, activityRes] = await Promise.all([
        api.get('/me/leave-balance'),
        api.get('/me/queue-position'),
        api.get('/me/activity'),
      ]);
      
      setLeaveBalance(balanceRes.data);
      setQueuePosition(queueRes.data);
      setActivity(activityRes.data);

      // Fetch workload if team_id exists
      if (user?.team_id) {
        const workloadRes = await api.get(`/teams/${user.team_id}/workload`);
        setWorkload(workloadRes.data);
        
        const calendarRes = await api.get(`/teams/${user.team_id}/calendar`);
        setUpcomingLeaves(calendarRes.data.slice(0, 5));
      }

      // Manager/HR leave announcements
      const mgLeaveRes = await api.get('/manager-leave');
      const today = new Date().toISOString().split('T')[0];
      setManagerLeaves(
        mgLeaveRes.data.filter(l => l.end_date >= today).slice(0, 3)
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const CircularGauge = ({ percentage, trend }) => {
    const conicGradient = `conic-gradient(
      ${percentage > 80 ? '#EF4444' : percentage > 50 ? '#F59E0B' : '#22C55E'} ${percentage * 3.6}deg,
      #E5E7EB ${percentage * 3.6}deg
    )`;

    return (
      <div className="relative w-40 h-40 mx-auto">
        <div
          className="w-full h-full rounded-full"
          style={{ background: conicGradient }}
        >
          <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center flex-col">
            <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {percentage}%
            </span>
            <div className="flex items-center gap-1 mt-1">
              {trend > 0 ? (
                <TrendingUp size={16} style={{ color: '#EF4444' }} />
              ) : (
                <TrendingDown size={16} style={{ color: '#22C55E' }} />
              )}
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {Math.abs(trend)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MiniCalendar = () => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const currentDay = today.getDate();

    return (
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="font-semibold py-1" style={{ color: 'var(--text-secondary)' }}>
            {day}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`}></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === currentDay;
          return (
            <div
              key={day}
              className={`py-1 rounded ${isToday ? 'font-bold text-white' : ''}`}
              style={{
                background: isToday ? 'var(--orange)' : 'transparent',
                color: isToday ? 'white' : 'var(--text-primary)',
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="employee-dashboard">
      {/* Queue Status Banner */}
      {queuePosition && queuePosition.position && (
        <div
          className="card border-l-4 animate-slideIn"
          style={{ borderLeftColor: 'var(--orange)', background: 'var(--orange-pale)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={24} style={{ color: 'var(--orange)' }} />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  You're #{queuePosition.position} in queue
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Estimated approval: {new Date(queuePosition.estimated_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/leave')}
              className="px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'var(--orange)' }}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Manager / HR Leave Announcements */}
      {managerLeaves.length > 0 && (
        <div className="space-y-2">
          {managerLeaves.map((l) => (
            <div
              key={l.id}
              className="card border-l-4 flex items-center gap-4 py-3"
              style={{ borderLeftColor: '#8B5CF6', background: '#F5F3FF' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: '#8B5CF6' }}
              >
                {l.first_name?.charAt(0)}{l.last_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: '#4C1D95' }}>
                  {l.role === 'hr' ? 'HR' : 'Manager'} Leave Notice
                </p>
                <p className="text-sm" style={{ color: '#6D28D9' }}>
                  <span className="font-medium">{l.first_name} {l.last_name}</span> will be on leave from{' '}
                  <span className="font-medium">
                    {new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>{' '}to{' '}
                  <span className="font-medium">
                    {new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card - Leave Balances */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Leave Balances
          </h3>
          {leaveBalance ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Annual</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>
                  {leaveBalance.annual} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Sick</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--success)' }}>
                  {leaveBalance.sick} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Wellness</span>
                <span className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>
                  {2 - leaveBalance.wellness_used} remaining
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Emergency</span>
                <span className="text-2xl font-bold" style={{ color: '#DC2626' }}>
                  {3 - leaveBalance.emergency_used} remaining
                </span>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  onClick={() => navigate('/leave/request')}
                  className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{ background: 'var(--orange)' }}
                >
                  Request Leave
                </button>
                <button
                  onClick={() => navigate('/leave/request?type=emergency')}
                  className="w-full py-3 rounded-lg font-semibold border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{ borderColor: '#DC2626', color: '#DC2626' }}
                >
                  Emergency Leave
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="w-full py-3 rounded-lg font-semibold border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
                >
                  My Calendar
                </button>
              </div>
            </div>
          ) : (
            <div className="shimmer h-64 rounded"></div>
          )}
        </div>

        {/* Middle Card - Team Workload */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Team Workload
          </h3>
          {workload ? (
            <div className="space-y-4">
              <CircularGauge percentage={workload.workload_current || 65} trend={10} />
              
              {workload.upcoming_deadlines && workload.upcoming_deadlines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Upcoming Deadlines
                  </p>
                  {workload.upcoming_deadlines.map((deadline, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded" style={{ background: 'var(--page-bg)' }}>
                      <span className="text-sm">{deadline.first_name} {deadline.last_name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(deadline.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="shimmer h-64 rounded"></div>
          )}
        </div>

        {/* Right Card - Team Calendar */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Team Calendar
          </h3>
          <MiniCalendar />
          
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Today's Events
            </p>
            {upcomingLeaves.length > 0 ? (
              upcomingLeaves.slice(0, 3).map((leave, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--orange-pale)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--orange)' }}></div>
                  <span className="text-sm flex-1">{leave.first_name} {leave.last_name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {leave.type}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                No events today
              </p>
            )}
          </div>

          {meetings.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Upcoming Meetings
              </p>
              {meetings.map((meeting, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <Video size={16} style={{ color: 'var(--orange)' }} />
                    <span className="text-sm">{meeting.title}</span>
                  </div>
                  <button
                    className="px-3 py-1 rounded text-xs font-medium text-white"
                    style={{ background: 'var(--success)' }}
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom - Recent Activity Feed */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent Activity
        </h3>
        {activity.length > 0 ? (
          <div className="space-y-4">
            {activity.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="relative">
                  <div
                    className="w-3 h-3 rounded-full mt-1"
                    style={{ background: 'var(--orange)' }}
                  ></div>
                  {idx < activity.length - 1 && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-4 w-0.5 h-12"
                      style={{ background: 'var(--border)' }}
                    ></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.action}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {item.details}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            No recent activity
          </p>
        )}
      </div>
    </div>
  );
}

export default EmployeeDashboard;
