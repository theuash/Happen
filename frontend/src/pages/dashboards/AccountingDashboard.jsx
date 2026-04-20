import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';

function AccountingDashboard() {
  const navigate = useNavigate();
  const [payrollData, setPayrollData] = useState(null);
  const [leaveImpact, setLeaveImpact] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Mock data for demo
    setPayrollData({
      total: 245000,
      deductions: 12500,
      pending: 8,
      processed: 142,
    });

    setLeaveImpact([
      { department: 'Engineering', unpaid_days: 12, cost_impact: 8400 },
      { department: 'Sales', unpaid_days: 5, cost_impact: 3200 },
      { department: 'Marketing', unpaid_days: 8, cost_impact: 5100 },
      { department: 'Support', unpaid_days: 3, cost_impact: 1800 },
    ]);

    setTransactions([
      { id: 1, type: 'Leave Deduction', employee: 'James Wu', amount: -450, date: '2026-04-18', status: 'processed' },
      { id: 2, type: 'Donation Credit', employee: 'Sarah Chen', amount: 320, date: '2026-04-17', status: 'processed' },
      { id: 3, type: 'Emergency Leave', employee: 'Diana Martinez', amount: -680, date: '2026-04-15', status: 'pending' },
      { id: 4, type: 'Leave Deduction', employee: 'Michael Brown', amount: -520, date: '2026-04-14', status: 'processed' },
    ]);
  };

  return (
    <div className="space-y-6" data-testid="accounting-dashboard">
      {/* Payroll Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Payroll
            </p>
            <DollarSign size={18} style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
            ${payrollData?.total.toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            This month
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Leave Deductions
            </p>
            <TrendingUp size={18} style={{ color: 'var(--danger)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--danger)' }}>
            ${payrollData?.deductions.toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Unpaid leave impact
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Pending Items
            </p>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--warning)' }}>
            {payrollData?.pending}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Awaiting approval
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Processed
            </p>
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {payrollData?.processed}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            This month
          </p>
        </div>
      </div>

      {/* Leave Impact by Department */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Leave Impact by Department
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Department
                </th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Unpaid Days
                </th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Cost Impact
                </th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {leaveImpact.map((dept, idx) => (
                <tr
                  key={idx}
                  className="border-b hover:bg-orange-50 transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <td className="py-3 px-4">
                    <span className="font-medium">{dept.department}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold">{dept.unpaid_days}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold" style={{ color: 'var(--danger)' }}>
                      ${dept.cost_impact.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background: 'var(--danger)',
                          width: `${(dept.unpaid_days / 15) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Gusto Integration</h4>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--success)' }}
            >
              Connected
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Last sync: 2 hours ago
          </p>
          <button
            className="w-full py-2 rounded-lg font-medium border-2 transition-all duration-200 hover:-translate-y-0.5"
            style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
          >
            Sync Now
          </button>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">ADP Integration</h4>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--success)' }}
            >
              Connected
            </span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Last sync: 1 hour ago
          </p>
          <button
            className="w-full py-2 rounded-lg font-medium border-2 transition-all duration-200 hover:-translate-y-0.5"
            style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
          >
            Sync Now
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Recent Transactions
        </h3>
        <div className="space-y-3">
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-all duration-200"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: txn.amount > 0 ? '#F0FDF4' : '#FEF2F2',
                    color: txn.amount > 0 ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="font-semibold">{txn.type}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {txn.employee}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="text-lg font-bold"
                  style={{ color: txn.amount > 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {txn.amount > 0 ? '+' : ''}${Math.abs(txn.amount)}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(txn.date).toLocaleDateString()}
                </p>
                <span
                  className="px-2 py-1 rounded text-xs font-semibold text-white mt-1 inline-block"
                  style={{
                    background: txn.status === 'processed' ? 'var(--success)' : 'var(--warning)',
                  }}
                >
                  {txn.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AccountingDashboard;
