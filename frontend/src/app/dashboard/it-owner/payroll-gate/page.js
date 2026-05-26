'use client';

import { useState, useEffect } from 'react';
import { Hourglass, Sparkles, Banknote } from 'lucide-react';

const INR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function PayrollGatePage() {
  const [data, setData] = useState({ pending: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [viewHistoryItem, setViewHistoryItem] = useState(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/payroll-gate')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFinalize = async () => {
    if (!data.pending?.id) return;
    setFinalizing(true);
    try {
      const res = await fetch('/api/admin/payroll-gate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.pending.id, action: 'finalize' })
      });
      if (res.ok) {
        setShowConfirm(false);
        load();
      } else {
        alert('Failed to finalize payroll');
      }
    } catch {
      alert('Error finalizing payroll');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReject = async () => {
    if (!data.pending?.id) return;
    try {
      const res = await fetch('/api/admin/payroll-gate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.pending.id, action: 'reject', reason: rejectReason })
      });
      if (res.ok) {
        setRejectModal(false);
        setRejectReason('');
        load();
      } else {
        alert('Failed to reject draft');
      }
    } catch {
      alert('Error rejecting payroll');
    }
  };

  const renderPayslipTable = (payslips) => (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 1.5fr', gap: '1rem', padding: '1rem 1.5rem', background: '#faf9f8', borderBottom: '1px solid #f0ece6', fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
        <div>Employee</div>
        <div>Department</div>
        <div style={{ textAlign: 'right' }}>Gross</div>
        <div style={{ textAlign: 'right', color: '#dc2626' }}>PF+ESI+TDS</div>
        <div style={{ textAlign: 'right', color: '#dc2626' }}>LOP</div>
        <div style={{ textAlign: 'right' }}>Other</div>
        <div style={{ textAlign: 'right', color: '#059669' }}>Net Pay</div>
      </div>
      {payslips.map((p, i) => (
        <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 1.5fr', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < payslips.length - 1 ? '1px solid #f9f8f7' : 'none', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{p.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{p.role}</div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>{p.department}</div>
          <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#111827' }}>{INR(p.gross)}</div>
          <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#dc2626' }}>{INR(p.pf + p.esi + p.tds)}</div>
          <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#dc2626' }}>{INR(p.lop)}</div>
          <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#6b7280' }}>—</div>
          <div style={{ textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>{INR(p.net)}</div>
        </div>
      ))}
    </div>
  );

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading payroll data...</div>;

  const { pending, history } = data;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Modals for Action */}
      {showConfirm && pending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 480, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Confirm Finalise & Disburse</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              You are about to finalise <strong>{pending.monthLabel} {pending.year} payroll</strong>.<br />
              Total net disbursement: <strong style={{ color: '#059669', fontSize: '1rem' }}>{INR(pending.totalNet)}</strong> for <strong>{pending.employeeCount}</strong> employees.<br /><br />
              This will lock the payroll, generate payslips, and notify all employees. <strong>This action cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleFinalize} disabled={finalizing} style={{ padding: '0.625rem 1.5rem', borderRadius: 9999, border: 'none', background: '#111827', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: finalizing ? 0.7 : 1 }}>
                {finalizing ? 'Processing...' : 'Confirm Finalise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && pending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 440, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem' }}>Reject Payroll Draft</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>This will delete the draft and send it back for HR to recalculate.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)" rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', outline: 'none' }} />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setRejectModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 9999, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReject} style={{ padding: '0.5rem 1.25rem', borderRadius: 9999, border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Reject Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* History Detail Modal */}
      {viewHistoryItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: '#f4f0eb', borderRadius: 20, width: '100%', maxWidth: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '1.5rem 2rem', background: '#fff', borderRadius: '20px 20px 0 0', borderBottom: '1px solid #f0ece6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{viewHistoryItem.monthLabel} {viewHistoryItem.year} Finalised Payroll</h2>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Finalised by {viewHistoryItem.finalizedBy} • {new Date(viewHistoryItem.updatedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => setViewHistoryItem(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            <div style={{ padding: '2rem', overflowY: 'auto' }}>
              {renderPayslipTable(viewHistoryItem.payslips)}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Payroll Gate</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Review and finalise payroll calculations submitted by HR.</p>
      </div>

      {pending ? (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Hourglass size={20} color="#d97706" /> Awaiting Sign-off: {pending.monthLabel} {pending.year}
            </h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setRejectModal(true)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
              <button onClick={() => setShowConfirm(true)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#7B5EA7', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>Finalise & Disburse</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Net Pay', value: INR(pending.totalNet), color: '#059669' },
              { label: 'Total Gross Pay', value: INR(pending.totalGross), color: '#111827' },
              { label: 'Total Deductions', value: INR(pending.totalPf + pending.totalEsi + pending.totalTds + pending.totalLop), color: '#dc2626' },
              { label: 'Employees Processed', value: pending.employeeCount, color: '#111827' }
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{s.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {renderPayslipTable(pending.payslips)}
        </div>
      ) : (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 16, padding: '3rem', textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ marginBottom: '0.5rem', color: '#64748b', display: 'flex', justifyContent: 'center' }}><Sparkles size={40} /></div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: '0 0 0.25rem' }}>All Caught Up</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>There are no pending payroll drafts awaiting your sign-off.</p>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1.5rem' }}>Payroll History</h2>
        {history.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No finalised payrolls yet.</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', background: '#faf9f8', borderBottom: '1px solid #f0ece6', fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
              <div>Cycle</div>
              <div>Employees</div>
              <div>Gross</div>
              <div>Deductions</div>
              <div style={{ color: '#059669' }}>Net Disbursed</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>
            {history.map((h, i) => (
              <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < history.length - 1 ? '1px solid #f9f8f7' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{h.monthLabel} {h.year}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Finalised by {h.finalizedBy} on {new Date(h.updatedAt).toLocaleDateString('en-IN')}</div>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>{h.employeeCount}</div>
                <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>{INR(h.totalGross)}</div>
                <div style={{ fontSize: '0.8125rem', color: '#dc2626' }}>{INR(h.totalPf + h.totalEsi + h.totalTds + h.totalLop)}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669' }}>{INR(h.totalNet)}</div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setViewHistoryItem(h)} style={{ padding: '0.375rem 0.875rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
