import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState(null);

  useEffect(() => {
    fetchCalendar();
  }, [currentMonth, currentYear]);

  const fetchCalendar = async () => {
    try {
      const res = await api.get(`/calendar?month=${currentMonth}&year=${currentYear}`);
      setCalendarData(res.data);
    } catch (error) {
      console.error('Error fetching calendar:', error);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Team Calendar
          </h2>
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
            const hasLeave = calendarData?.leaves?.some((l) => l.date === dateStr);

            return (
              <div
                key={day}
                className="aspect-square p-2 rounded-lg border hover:border-orange-300 transition-all duration-150 cursor-pointer"
                style={{
                  borderColor: hasLeave ? 'var(--orange)' : 'var(--border)',
                  background: hasLeave ? 'var(--orange-pale)' : 'white',
                }}
                data-testid={`calendar-day-${day}`}
              >
                <span className="text-sm font-medium">{day}</span>
                {hasLeave && (
                  <div className="w-2 h-2 rounded-full mt-1" style={{ background: 'var(--orange)' }}></div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--orange)' }}></div>
            <span className="text-sm">Approved Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--warning)' }}></div>
            <span className="text-sm">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-sm">Holiday</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
