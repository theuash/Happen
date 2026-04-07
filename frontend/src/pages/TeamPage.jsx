import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function TeamPage() {
  const user = useAuthStore((state) => state.user);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState(null);

  useEffect(() => {
    if (user?.team_id) {
      fetchCalendar();
    }
  }, [currentMonth, currentYear, user?.team_id]);

  const fetchCalendar = async () => {
    try {
      const res = await api.get(`/teams/${user.team_id}/calendar`);
      setCalendarData(res.data);
    } catch (error) {
      console.error('Error fetching team calendar:', error);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  // Group leaves by date
  const leavesByDate = {};
  calendarData?.forEach((leave) => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!leavesByDate[dateStr]) {
        leavesByDate[dateStr] = [];
      }
      leavesByDate[dateStr].push(leave);
    }
  });

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();

  return (
    <div className="space-y-6" data-testid="team-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            My Team Calendar
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            View your team members' approved leaves
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (currentMonth === 1) {
                setCurrentMonth(12);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            data-testid="prev-month"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold min-w-[150px] text-center">
            {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              if (currentMonth === 12) {
                setCurrentMonth(1);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
            data-testid="next-month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold py-2" style={{ color: 'var(--text-secondary)' }}>
              {day}
            </div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayLeaves = leavesByDate[dateStr] || [];

            return (
              <div
                key={day}
                className="p-2 rounded-lg border transition-all duration-150 min-h-24"
                style={{
                  borderColor: dayLeaves.length > 0 ? 'var(--orange)' : 'var(--border)',
                  background: dayLeaves.length > 0 ? 'var(--orange-pale)' : 'white',
                }}
                data-testid={`team-calendar-day-${day}`}
              >
                <span className="text-sm font-medium">{day}</span>
                {dayLeaves.length > 0 && (
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayLeaves.slice(0, 3).map((leave, idx) => (
                      <div
                        key={idx}
                        className="text-xs px-1 py-0.5 rounded truncate"
                        style={{
                          background: 'rgba(255, 165, 0, 0.3)',
                          color: 'var(--text-primary)',
                        }}
                        title={`${leave.first_name} ${leave.last_name} - ${leave.type} (${leave.status})`}
                      >
                        {leave.first_name} {leave.last_name}
                      </div>
                    ))}
                    {dayLeaves.length > 3 && (
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        +{dayLeaves.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--orange)' }}></div>
            <span className="text-sm">Approved/ Emergency Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamPage;
