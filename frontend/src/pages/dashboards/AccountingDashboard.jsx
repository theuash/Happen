import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { DollarSign, TrendingUp, Building } from 'lucide-react';

function AccountingDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const summaryRes = await api.get('/accounting/summary');
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching accounting data:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="accounting-dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={24} style={{ color: 'var(--orange)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Total Payroll
            </span>
          </div>
          {summary && (
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ${summary.total_payroll.toLocaleString()}
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={24} style={{ color: 'var(--success)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Leave Costs
            </span>
          </div>
          {summary && (
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ${summary.leave_costs.toLocaleString()}
            </p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Building size={24} style={{ color: 'var(--warning)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Departments
            </span>
          </div>
          {summary && (
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {summary.department_count}
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Department Cost Breakdown
        </h3>
        <div className="space-y-3">
          {['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'].map((dept, idx) => (
            <div key={dept} className="flex items-center justify-between">
              <span className="font-medium">{dept}</span>
              <div className="flex items-center gap-4">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ background: 'var(--orange)', width: `${[75, 60, 45, 30, 50][idx]}%` }}
                  ></div>
                </div>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  ${[75000, 60000, 45000, 30000, 50000][idx].toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Integration Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Payroll System', 'Time Tracking', 'Accounting Software'].map((integration) => (
            <div key={integration} className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <p className="font-medium mb-2">{integration}</p>
              <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ background: 'var(--success)' }}>
                Connected
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AccountingDashboard;
