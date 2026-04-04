import { useEffect, useState } from 'react';
import api from '../lib/axios';
import { toast } from 'sonner';

function WellnessPage() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/me/wellness-balance');
      setBalance(res.data);
    } catch (error) {
      console.error('Error fetching wellness balance:', error);
    }
  };

  const handleRequest = async () => {
    setLoading(true);
    try {
      const res = await api.post('/wellness/request');
      toast.success(res.data.message);
      fetchBalance();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto" data-testid="wellness-page">
      <div className="card text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Wellness Days
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Take time for self-care. No questions asked.
        </p>

        {balance && (
          <div className="mb-8">
            <div className="text-6xl font-bold mb-2" style={{ color: 'var(--orange)' }}>
              {balance.remaining}/{balance.total}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Wellness days remaining this year
            </p>
          </div>
        )}

        <button
          onClick={handleRequest}
          disabled={loading || balance?.remaining === 0}
          className="px-8 py-4 rounded-lg text-xl font-semibold text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--orange)', height: '56px' }}
          data-testid="take-wellness-day-button"
        >
          {loading ? 'Processing...' : 'Take a Wellness Day'}
        </button>

        {balance?.remaining === 0 && (
          <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
            You've used all your wellness days for this year.
          </p>
        )}
      </div>
    </div>
  );
}

export default WellnessPage;
