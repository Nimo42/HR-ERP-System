'use client';

import { useEffect, useState } from 'react';
import { Calendar, FileText, CheckCircle2, AlertCircle, Play, ShieldAlert, Sparkles, Printer } from 'lucide-react';

export default function UnifiedPayroll() {
  const [currentUser, setCurrentUser] = useState(null);
  const [runs, setRuns] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  // HR trigger states
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [selectedPayslip, setSelectedPayslip] = useState(null); // For itemized overlay print

  async function loadData() {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const payrollRes = await fetch('/api/payroll');
      const payrollData = await payrollRes.json();

      if (['HR Manager', 'IT Owner'].includes(meData.user?.role)) {
        setRuns(payrollData.runs || []);
      } else {
        setPayslips(payrollData.payslips || []);
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
        body: JSON.stringify({ month: parseInt(month), year: parseInt(year) })
      });
      if (res.ok) {
        alert('Draft payroll runs calculated successfully.');
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to calculate');
      }
    } catch (err) {
      alert('Error occurred.');
    } finally {
      setCalculating(false);
    }
  }

  async function handleFinalize(runId) {
    if (!confirm('Are you sure you want to finalize this payroll run? This will release payslips to all employees and trigger email/notification alerts.')) return;
    setFinalizing(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: runId, status: 'Finalized' })
      });
      if (res.ok) {
        alert('Payroll finalized and released!');
        loadData();
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to finalize');
      }
    } catch (e) {
      alert('Error occurred.');
    } finally {
      setFinalizing(false);
    }
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Payroll center...</div>;

  const isHR = currentUser?.role === 'HR Manager';
  const isOwner = currentUser?.role === 'IT Owner';

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Payroll Portal</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
          {isHR || isOwner ? 'Two-person control payroll configuration, draft runs, and release workflows.' : 'View, print, and audit your released payslips.'}
        </p>
      </div>

      {/* ==================== 1. HR VIEW (CALCULATE DRAFT) ==================== */}
      {isHR && (
        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.75rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={18} color="#7B5EA7" /> Run Month-End Payroll Calculations
          </h2>
          <form onSubmit={handleRunPayroll} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                {monthNames.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Year</label>
              <select value={year} onChange={e => setYear(e.target.value)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="submit" disabled={calculating} style={{
              padding: '0.625rem 1.5rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8,
              cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', opacity: calculating ? 0.7 : 1
            }}>
              {calculating ? 'Calculating Draft...' : 'Calculate Draft Runs'}
            </button>
          </form>
        </div>
      )}

      {/* ==================== 2. ADMIN LIST VIEW (IT OWNER & HR MANAGER) ==================== */}
      {(isHR || isOwner) && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0ece6', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Calculated Payroll Runs</span>
            {isOwner && (
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldAlert size={12} /> IT Owners can finalise drafts
              </span>
            )}
          </div>
          {runs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No payroll runs created.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {runs.map(run => (
                <div key={run.id} style={{ padding: '1.5rem', borderBottom: '1px solid #fafaf9', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {monthNames[run.month - 1]} {run.year} Payroll
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Calculated by {run.createdBy} on {new Date(run.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{
                        padding: '0.2rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                        background: run.status === 'Finalized' ? '#d1fae5' : '#fef9c3',
                        color: run.status === 'Finalized' ? '#065f46' : '#854d0e'
                      }}>{run.status}</span>
                      
                      {isOwner && run.status === 'Draft' && (
                        <button onClick={() => handleFinalize(run.id)} disabled={finalizing} style={{
                          padding: '0.4rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600
                        }}>
                          {finalizing ? 'Finalising...' : 'Finalise & Release'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Itemized employees spreadsheet summary preview */}
                  <div style={{ border: '1px solid #f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f3f4f6' }}>
                          {['Employee', 'Base', 'PF', 'TDS', 'LOP Absences', 'Net salary'].map(h => (
                            <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#9ca3af', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {run.payslips?.map(slip => (
                          <tr key={slip.id} style={{ borderBottom: '1px solid #f9f9fb' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{slip.user?.name}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#4b5563' }}>₹{slip.gross.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#ef4444' }}>-₹{slip.pf.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: '#ef4444' }}>-₹{slip.tds.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: slip.lop > 0 ? '#ef4444' : '#9ca3af' }}>-₹{slip.lop.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#10b981' }}>₹{slip.net.toLocaleString('en-IN')}</td>
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

      {/* ==================== 3. EMPLOYEE PERSONAL VIEW ==================== */}
      {!isHR && !isOwner && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0ece6', fontWeight: 600 }}>My Released Payslips</div>
          {payslips.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No payslips released yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f0ece6' }}>
                  {['Pay Period', 'Gross Salary', 'Total Deductions', 'Net Salary Paid', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payslips.map(slip => {
                  const deductions = slip.pf + slip.esi + slip.tds + slip.lop;
                  return (
                    <tr key={slip.id} style={{ borderBottom: '1px solid #fafaf9' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        {monthNames[slip.payrollRun?.month - 1]} {slip.payrollRun?.year}
                      </td>
                      <td style={{ padding: '1rem', color: '#4b5563' }}>₹{slip.gross.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '1rem', color: '#ef4444' }}>-₹{deductions.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#10b981' }}>₹{slip.net.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button onClick={() => setSelectedPayslip(slip)} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem',
                          background: '#fafaf9', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600
                        }}>
                          <Printer size={13} /> Print/View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ==================== 4. ITEMISED PAYSLIP PRINT MODAL OVERLAY ==================== */}
      {selectedPayslip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative' }}>
            
            <button onClick={() => setSelectedPayslip(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontWeight: 600 }}>
              Close
            </button>

            {/* Print Area */}
            <div id="payslip-print-section" style={{ padding: '1rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #7B5EA7', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7B5EA7' }}>antbox</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>Payslip Advice / Monthly Remuneration</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8125rem', color: '#4b5563', marginBottom: '1.5rem' }}>
                <div>
                  <strong>Employee:</strong> {currentUser?.name}
                </div>
                <div>
                  <strong>Period:</strong> {monthNames[selectedPayslip.payrollRun?.month - 1]} {selectedPayslip.payrollRun?.year}
                </div>
                <div>
                  <strong>Email:</strong> {currentUser?.email}
                </div>
                <div>
                  <strong>Role:</strong> {currentUser?.role}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                  <span>Gross Basic Salary</span>
                  <span style={{ fontWeight: 600 }}>₹{selectedPayslip.gross.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem', color: '#ef4444' }}>
                  <span>PF Contribution (12%)</span>
                  <span>-₹{selectedPayslip.pf.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem', color: '#ef4444' }}>
                  <span>ESI contribution (0.75%)</span>
                  <span>-₹{selectedPayslip.esi.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem', color: '#ef4444' }}>
                  <span>TDS Deductions (10%)</span>
                  <span>-₹{selectedPayslip.tds.toLocaleString('en-IN')}</span>
                </div>
                {selectedPayslip.lop > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem', color: '#ef4444' }}>
                    <span>Loss of Pay (Absences)</span>
                    <span>-₹{selectedPayslip.lop.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '2px solid #7B5EA7', fontSize: '1.125rem', fontWeight: 800, color: '#10b981' }}>
                  <span>Net Salary Disbursed</span>
                  <span>₹{selectedPayslip.net.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
              <button onClick={() => window.print()} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.625rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
              }}>
                <Printer size={16} /> Print Payslip
              </button>
              <button onClick={() => setSelectedPayslip(null)} style={{
                flex: 1, padding: '0.625rem', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
              }}>Close</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
