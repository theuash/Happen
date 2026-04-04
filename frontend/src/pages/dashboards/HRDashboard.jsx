import { useEffect, useState } from 'react';
import api from '../../lib/axios';
import { Clock, AlertCircle } from 'lucide-react';

function HRDashboard() {
  const [emergencyLeaves, setEmergencyLeaves] = useState([]);
  const [biasReport, setBiasReport] = useState([]);
  const [compliance, setCompliance] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [emergencyRes, biasRes, complianceRes] = await Promise.all([
        api.get('/hr/emergency-leaves'),
        api.get('/hr/bias-report'),
        api.get('/hr/compliance'),
      ]);
      setEmergencyLeaves(emergencyRes.data);
      setBiasReport(biasRes.data);
      setCompliance(complianceRes.data);
    } catch (error) {
      console.error('Error fetching HR data:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="hr-dashboard">
      {emergencyLeaves.length > 0 && (
        <div className="card border-l-4" style={{ borderLeftColor: 'var(--danger)', background: '#FEF2F2' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'var(--danger)' }}>
              Urgent: Proof Review Required
            </h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {emergencyLeaves.length} emergency leave(s) awaiting proof verification
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Emergency Leave Proofs
          </h3>
          {emergencyLeaves.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No pending emergency leave proofs
            </p>
          ) : (
            <div className="space-y-3">
              {emergencyLeaves.map((leave, idx) => (
                <div key={idx} className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{leave.employee}</span>
                    <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--danger)' }}>
                      <Clock size={14} />
                      {leave.hours_remaining}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Bias Detection
          </h3>
          {biasReport.length === 0 ? (
            <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No bias indicators detected
            </p>
          ) : (
            <div className="space-y-3">
              {biasReport.map((report, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                  <p className="font-medium">{report.title}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {report.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Statutory Compliance
          </h3>
          {compliance && (
            <div className="text-center">
              <div className="text-5xl font-bold mb-2" style={{ color: 'var(--success)' }}>
                {compliance.statutory_compliance}%
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Overall compliance score
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Employee Search
          </h3>
          <input
            type="text"
            placeholder="Search employee..."
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--border)' }}
            data-testid="employee-search-input"
          />
        </div>
      </div>
    </div>
  );
}

export default HRDashboard;
