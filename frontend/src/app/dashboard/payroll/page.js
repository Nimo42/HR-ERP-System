'use client';

import { useEffect, useState } from 'react';
import { Play, ShieldAlert } from 'lucide-react';
import EmployeePayslipsView from '../../../components/EmployeePayslipsView';

export default function UnifiedPayroll() {
  const [currentUser, setCurrentUser] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [calculating, setCalculating] = useState(false);

  async function loadData() {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      if (meData.user?.role === 'HR Manager') {
        const payrollRes = await fetch('/api/payroll');
        const payrollData = await payrollRes.json();
        setRuns(payrollData.runs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRunPayroll(e) {
    e.preventDefault();
    setCalculating(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: parseInt(month, 10), year: parseInt(year, 10) })
      });
      if (res.ok) {
        alert('Draft payroll calculated successfully.');
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to calculate payroll');
      }
    } catch (err) {
      alert('Error occurred while calculating payroll.');
    } finally {
      setCalculating(false);
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Payroll center...</div>;

  const isHR = currentUser?.role === 'HR Manager';

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Payroll Portal</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
          {isHR ? 'Run payroll using live attendance active-hours and saved monthly salaries.' : 'View, print, and audit your released payslips.'}
        </p>
      </div>

      {isHR && (
        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.75rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={18} color="#7B5EA7" /> Run Month-End Payroll Calculations
          </h2>
          <form onSubmit={handleRunPayroll} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                {monthNames.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="submit" disabled={calculating} style={{ padding: '0.625rem 1.5rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', opacity: calculating ? 0.7 : 1 }}>
              {calculating ? 'Calculating Draft...' : 'Calculate Draft Runs'}
            </button>
          </form>
        </div>
      )}

      {isHR && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0ece6', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Calculated Payroll Runs</span>
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ShieldAlert size={12} /> Admin finalisation happens in Payroll Gate
            </span>
          </div>

          {runs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No payroll runs created.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {runs.map(run => (
                <div key={run.id} style={{ padding: '1.5rem', borderBottom: '1px solid #fafaf9', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{monthNames[run.month - 1]} {run.year} Payroll</h3>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Calculated by {run.createdBy} on {new Date(run.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <span style={{ padding: '0.2rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: run.status === 'Finalized' ? '#d1fae5' : '#fef9c3', color: run.status === 'Finalized' ? '#065f46' : '#854d0e' }}>{run.status}</span>
                  </div>

                  <div style={{ border: '1px solid #f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f3f4f6' }}>
                          {['Employee', 'Base', 'PF', 'TDS', 'LOP', 'Net salary'].map(h => (
                            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {run.payslips?.map(slip => (
                          <tr key={slip.id} style={{ borderBottom: '1px solid #f9f9fb' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{slip.user?.name}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#4b5563' }}>INR {slip.gross.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#ef4444' }}>-INR {slip.pf.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#ef4444' }}>-INR {slip.tds.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: slip.lop > 0 ? '#ef4444' : '#9ca3af' }}>-INR {slip.lop.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#10b981' }}>INR {slip.net.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isHR && <EmployeePayslipsView />}
    </div>
  );
}
