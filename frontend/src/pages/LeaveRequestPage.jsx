import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { toast } from 'sonner';
import { formatApiErrorDetail } from '../utils/formatError';

function LeaveRequestPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'annual',
    start_date: '',
    end_date: '',
    half_day: false,
    am_pm: 'AM',
    reason: '',
    is_emergency: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/leave-requests', formData);
      setResult(res.data);
      toast.success('Leave request submitted!');
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail) || error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return formData.half_day ? 0.5 : days;
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="leave-request-result">
        <div
          className={`card text-center animate-bounce-in ${
            result.status === 'approved' ? 'border-l-4' : ''
          }`}
          style={{
            borderLeftColor: result.status === 'approved' ? 'var(--success)' : undefined,
            background: result.status === 'approved' ? '#F0FDF4' : result.status === 'queued' ? '#FFF7ED' : '#F9FAFB',
          }}
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{
              background:
                result.status === 'approved'
                  ? 'var(--success)'
                  : result.status === 'queued'
                  ? 'var(--warning)'
                  : 'var(--orange)',
              color: 'white',
            }}
          >
            {result.status === 'approved' ? '✓' : result.status === 'queued' ? '#' + result.queue_position : '⏱'}
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {result.status === 'approved' && 'Request Approved!'}
            {result.status === 'queued' && 'Added to Queue'}
            {result.status === 'pending' && 'Request Pending'}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {result.message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/leave')}
              className="px-6 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'var(--orange)' }}
              data-testid="view-requests-button"
            >
              View My Requests
            </button>
            <button
              onClick={() => {
                setResult(null);
                setFormData({
                  type: 'annual',
                  start_date: '',
                  end_date: '',
                  half_day: false,
                  am_pm: 'AM',
                  reason: '',
                  is_emergency: false,
                });
              }}
              className="px-6 py-2 rounded-lg font-medium border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
              data-testid="new-request-button"
            >
              New Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" data-testid="leave-request-page">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Request Leave
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Leave Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {['annual', 'sick', 'wellness', 'emergency'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className="px-4 py-2 rounded-full font-medium transition-all duration-200 capitalize"
                  style={{
                    background: formData.type === type ? 'var(--orange)' : 'white',
                    color: formData.type === type ? 'white' : 'var(--text-primary)',
                    border: `2px solid ${formData.type === type ? 'var(--orange)' : 'var(--border)'}`,
                  }}
                  data-testid={`leave-type-${type}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)' }}
                data-testid="start-date-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)' }}
                data-testid="end-date-input"
              />
            </div>
          </div>

          {/* Half Day Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.half_day}
              onChange={(e) => setFormData({ ...formData, half_day: e.target.checked })}
              className="w-5 h-5 rounded"
              style={{ accentColor: 'var(--orange)' }}
              data-testid="half-day-checkbox"
            />
            <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Half Day
            </label>
            {formData.half_day && (
              <select
                value={formData.am_pm}
                onChange={(e) => setFormData({ ...formData, am_pm: e.target.value })}
                className="px-3 py-1 rounded border"
                style={{ borderColor: 'var(--border)' }}
                data-testid="am-pm-select"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            )}
          </div>

          {/* Reason */}
          {!['wellness', 'emergency'].includes(formData.type) && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Reason (Optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)' }}
                placeholder="Briefly describe your reason..."
                data-testid="reason-textarea"
              />
            </div>
          )}

          {/* Emergency Warning */}
          {formData.type === 'emergency' && (
            <div className="p-4 rounded-lg border-l-4" style={{ borderLeftColor: 'var(--warning)', background: '#FFF7ED' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
                Uses 1 of 3 annual emergency leaves. Proof required within 48 hours.
              </p>
            </div>
          )}

          {/* Days Count */}
          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Total Days:
            </p>
            <p className="text-3xl font-bold" style={{ color: 'var(--orange)' }}>
              {calculateDays()}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--orange)' }}
            data-testid="submit-request-button"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LeaveRequestPage;
