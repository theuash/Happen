import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { toast } from 'sonner';
import { formatApiErrorDetail } from '../utils/formatError';
import { AlertTriangle, CheckCircle, Clock, Heart, Stethoscope } from 'lucide-react';

// Minimum date = 7 days from today
const minAnnualDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

function LeaveRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('type'); // type | form | confirm | result
  const [type, setType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Annual form
  const [startDate, setStartDate] = useState(minAnnualDate());
  const [endDate, setEndDate] = useState(minAnnualDate());
  const [annualReason, setAnnualReason] = useState('');

  // Sick form
  const [sickDay, setSickDay] = useState('today');

  // Wellness form
  const [wellnessReason, setWellnessReason] = useState('sick');
  const [amPm, setAmPm] = useState('AM');

  const submit = async (payload) => {
    setLoading(true);
    try {
      const res = await api.post('/leave-requests', payload);
      setResult(res.data);
      setStep('result');
      toast.success('Leave request submitted!');
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('type'); setType(null); setResult(null);
    setStartDate(minAnnualDate()); setEndDate(minAnnualDate());
    setAnnualReason(''); setSickDay('today'); setWellnessReason('sick'); setAmPm('AM');
  };

  // ── TYPE SELECTION ──────────────────────────────────────────────────────────
  if (step === 'type') {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="card">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Request Leave</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Choose the type of leave you need</p>

          <div className="grid grid-cols-1 gap-3">
            {/* Annual */}
            <button
              onClick={() => { setType('annual'); setStep('form'); }}
              className="flex items-start gap-4 p-5 rounded-xl border-2 text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderColor: 'var(--orange)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--orange-pale)' }}>
                <Clock size={24} style={{ color: 'var(--orange)' }} />
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Annual Leave</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Plan ahead — must be requested at least <strong>1 week in advance</strong>. Subject to team workload.
                </p>
              </div>
            </button>

            {/* Sick */}
            <button
              onClick={() => { setType('sick'); setStep('form'); }}
              className="flex items-start gap-4 p-5 rounded-xl border-2 text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderColor: 'var(--success)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F0FDF4' }}>
                <Stethoscope size={24} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Sick Leave</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  For today or tomorrow only. One click — auto-approved. Your team lead and manager are notified.
                </p>
              </div>
            </button>

            {/* Wellness */}
            <button
              onClick={() => { setType('wellness'); setStep('form'); }}
              className="flex items-start gap-4 p-5 rounded-xl border-2 text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderColor: '#8B5CF6' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5F3FF' }}>
                <Heart size={24} style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Wellness Half-Day</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Take a half-day today for personal wellness. Select AM or PM and a brief reason.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ANNUAL FORM ─────────────────────────────────────────────────────────────
  if (step === 'form' && type === 'annual') {
    const days = startDate && endDate
      ? Math.max(0, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
      : 0;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={reset} className="text-sm" style={{ color: 'var(--orange)' }}>← Back</button>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Annual Leave</h2>
          </div>

          <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: 'var(--orange-pale)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--orange)' }} />
            <p className="text-sm" style={{ color: 'var(--orange)' }}>
              Annual leave must be scheduled at least <strong>1 week in advance</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                min={minAnnualDate()}
                onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }}
                className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || minAnnualDate()}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
              />
            </div>
          </div>

          {days > 0 && (
            <p className="text-center text-3xl font-bold" style={{ color: 'var(--orange)' }}>
              {days} day{days !== 1 ? 's' : ''}
            </p>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Reason (optional)</label>
            <textarea
              value={annualReason}
              onChange={e => setAnnualReason(e.target.value)}
              rows={3}
              placeholder="Briefly describe your reason..."
              className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 resize-none"
              style={{ borderColor: 'var(--border)', '--tw-ring-color': 'var(--orange)' }}
            />
          </div>

          <button
            onClick={() => submit({ type: 'annual', start_date: startDate, end_date: endDate, reason: annualReason })}
            disabled={loading || !startDate || !endDate}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--orange)' }}
          >
            {loading ? 'Submitting…' : 'Submit Annual Leave Request'}
          </button>
        </div>
      </div>
    );
  }

  // ── SICK FORM ───────────────────────────────────────────────────────────────
  if (step === 'form' && type === 'sick') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={reset} className="text-sm" style={{ color: 'var(--orange)' }}>← Back</button>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sick Leave</h2>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sick leave is auto-approved. Your team lead and manager will be notified immediately.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'today',    label: 'Today',    sub: today() },
              { value: 'tomorrow', label: 'Tomorrow', sub: tomorrow() },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSickDay(opt.value)}
                className="p-5 rounded-xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  borderColor: sickDay === opt.value ? 'var(--success)' : 'var(--border)',
                  background:  sickDay === opt.value ? '#F0FDF4' : 'white',
                }}
              >
                <p className="font-bold text-lg" style={{ color: sickDay === opt.value ? 'var(--success)' : 'var(--text-primary)' }}>
                  {opt.label}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{opt.sub}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => submit({ type: 'sick', start_date: sickDay === 'today' ? today() : tomorrow() })}
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: 'var(--success)' }}
          >
            {loading ? 'Submitting…' : `Take Sick Leave — ${sickDay === 'today' ? 'Today' : 'Tomorrow'}`}
          </button>
        </div>
      </div>
    );
  }

  // ── WELLNESS FORM ───────────────────────────────────────────────────────────
  if (step === 'form' && type === 'wellness') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={reset} className="text-sm" style={{ color: 'var(--orange)' }}>← Back</button>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Wellness Half-Day</h2>
          </div>

          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Take a half-day today for your wellbeing. Auto-approved.
          </p>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Reason</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'sick',     label: 'Feeling Unwell',  icon: '🤒' },
                { value: 'wellness', label: 'Personal Wellness', icon: '🧘' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setWellnessReason(opt.value)}
                  className="p-4 rounded-xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: wellnessReason === opt.value ? '#8B5CF6' : 'var(--border)',
                    background:  wellnessReason === opt.value ? '#F5F3FF' : 'white',
                  }}
                >
                  <div className="text-2xl mb-1">{opt.icon}</div>
                  <p className="font-semibold text-sm" style={{ color: wellnessReason === opt.value ? '#8B5CF6' : 'var(--text-primary)' }}>
                    {opt.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Half-Day</label>
            <div className="grid grid-cols-2 gap-3">
              {['AM','PM'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setAmPm(opt)}
                  className="py-3 rounded-xl border-2 font-semibold transition-all duration-200"
                  style={{
                    borderColor: amPm === opt ? '#8B5CF6' : 'var(--border)',
                    background:  amPm === opt ? '#F5F3FF' : 'white',
                    color:       amPm === opt ? '#8B5CF6' : 'var(--text-primary)',
                  }}
                >
                  {opt} — {opt === 'AM' ? 'Morning off' : 'Afternoon off'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => submit({ type: 'wellness', reason: wellnessReason, am_pm: amPm })}
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: '#8B5CF6' }}
          >
            {loading ? 'Submitting…' : `Take ${amPm} Half-Day`}
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const isApproved = result.status === 'approved';
    const isQueued   = result.status === 'queued';
    const isEmergency= result.status === 'emergency';

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center space-y-4 animate-bounce-in">
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl"
            style={{ background: isApproved || isEmergency ? 'var(--success)' : isQueued ? 'var(--warning)' : 'var(--orange)' }}
          >
            {isApproved || isEmergency ? '✓' : isQueued ? `#${result.queue_position}` : '⏱'}
          </div>

          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isApproved && 'Leave Approved!'}
            {isQueued   && 'Added to Queue'}
            {isEmergency && 'Emergency Leave Granted'}
          </h2>

          <p style={{ color: 'var(--text-secondary)' }}>{result.message}</p>

          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => navigate('/leave')} className="px-6 py-2.5 rounded-lg font-semibold text-white" style={{ background: 'var(--orange)' }}>
              View My Requests
            </button>
            <button onClick={reset} className="px-6 py-2.5 rounded-lg font-semibold border-2" style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}>
              New Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default LeaveRequestPage;
