import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { TrendingUp, Users, AlertTriangle } from 'lucide-react';

function ManagerDashboard() {
  const [companyWorkload, setCompanyWorkload] = useState(null);
  const [burnoutRisk, setBurnoutRisk] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workloadRes, burnoutRes] = await Promise.all([
        api.get('/company/workload'),
        api.get('/company/burnout-risk'),
      ]);
      setCompanyWorkload(workloadRes.data);
      setBurnoutRisk(burnoutRes.data);
    } catch (error) {
      console.error('Error fetching manager data:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="manager-dashboard">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Company-Wide Overview
        </h2>
        {companyWorkload && (
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold" style={{ color: 'var(--orange)' }}>
              {companyWorkload.percentage}%
            </div>
            <div>
              <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                Overall Workload
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Across all teams
              </p>
            </div>
          </div>
        )}
      </div>

      {burnoutRisk.alerts && burnoutRisk.alerts.length > 0 && (
        <div
          className="card border-l-4"
          style={{ borderLeftColor: 'var(--danger)', background: '#FEF2F2' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--danger)' }}>
                Burnout Risk Alert
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {burnoutRisk.alerts.length} employee(s) haven't taken leave in over 6 months
              </p>
              <div className="mt-4 space-y-2">
                {burnoutRisk.alerts.map((alert, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <span className="font-medium">{alert.employee}</span>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: 'var(--danger)' }}
                    >
                      {alert.days_since_leave} days
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Engineering', 'Sales', 'Marketing', 'Support'].map((team, idx) => (
          <div key={team} className="card hover:-translate-y-1 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {team}
              </h4>
              <Users size={18} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  background:
                    idx === 0
                      ? 'var(--danger)'
                      : idx === 1
                      ? 'var(--warning)'
                      : 'var(--success)',
                  width: `${[85, 68, 45, 52][idx]}%`,
                }}
              ></div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {[85, 68, 45, 52][idx]}% workload
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ManagerDashboard;
