'use client';

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Download, Eye, X, FileText } from 'lucide-react';

export default function EmployeePayslipsView() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [me, setMe] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [meRes, payrollRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/payroll')
      ]);
      const meData = await meRes.json();
      setMe(meData.user);

      if (payrollRes.ok) {
        const data = await payrollRes.json();
        setPayslips(data.payslips || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function handleDownload(slip) {
    const a = document.createElement('a');
    a.href = `/api/payroll/payslip/${slip.id}/pdf`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Payslips...</div>;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ background: '#f3e8ff', padding: '0.75rem', borderRadius: 12, color: '#7B5EA7' }}>
          <Briefcase size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#111827' }}>My Payslips</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>View and download your monthly salary slips.</p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        {payslips.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <FileText size={48} color="#e5e7eb" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#374151', margin: '0 0 0.5rem 0' }}>No payslips available</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', maxWidth: '300px', margin: '0 auto' }}>You do not have any finalized payslips available for download yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {payslips.map((slip, idx) => {
              const month = monthNames[slip.payrollRun.month - 1];
              const year = slip.payrollRun.year;
              
              return (
                <div key={slip.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: idx < payslips.length - 1 ? '1px solid #f3f4f6' : 'none', transition: 'background 0.2s', ':hover': { background: '#fafaf9' } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', width: 48, height: 48, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{month.slice(0,3)}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', lineHeight: 1, marginTop: '2px' }}>{year}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>Salary Slip - {month} {year}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Net Pay: <span style={{ fontWeight: 600, color: '#10b981' }}>₹{slip.net.toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setSelectedSlip(slip)} style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => handleDownload(slip)} style={{ background: '#7B5EA7', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 1px 2px rgba(123, 94, 167, 0.2)' }}>
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal View */}
      {selectedSlip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '600px', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ background: '#fafaf9', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Salary Slip - {monthNames[selectedSlip.payrollRun.month - 1]} {selectedSlip.payrollRun.year}</h2>
              <button onClick={() => setSelectedSlip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px dashed #e5e7eb' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '1.125rem', marginBottom: '0.25rem' }}>Antbox</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Employee ID: {me?.id.slice(-6).toUpperCase()}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Name: {me?.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Earnings</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>₹{selectedSlip.net.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '1rem', letterSpacing: '0.05em' }}>Earnings</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#4b5563' }}>Basic Pay</span>
                    <span style={{ fontWeight: 600, color: '#111827' }}>₹{selectedSlip.gross.toLocaleString('en-IN')}</span>
                  </div>
                  {/* Assuming gross is the total earnings for simplicity here */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', marginTop: '1rem' }}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>Total Earnings</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>₹{selectedSlip.gross.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '1rem', letterSpacing: '0.05em' }}>Deductions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {selectedSlip.pf > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#4b5563' }}>Provident Fund (PF)</span><span style={{ fontWeight: 600, color: '#111827' }}>₹{selectedSlip.pf.toLocaleString('en-IN')}</span></div>}
                    {selectedSlip.esi > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#4b5563' }}>ESI</span><span style={{ fontWeight: 600, color: '#111827' }}>₹{selectedSlip.esi.toLocaleString('en-IN')}</span></div>}
                    {selectedSlip.tds > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#4b5563' }}>TDS</span><span style={{ fontWeight: 600, color: '#111827' }}>₹{selectedSlip.tds.toLocaleString('en-IN')}</span></div>}
                    {selectedSlip.lop > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#4b5563' }}>Loss of Pay (LOP)</span><span style={{ fontWeight: 600, color: '#111827' }}>₹{selectedSlip.lop.toLocaleString('en-IN')}</span></div>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', marginTop: '1rem' }}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>Total Deductions</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>₹{(selectedSlip.pf + selectedSlip.esi + selectedSlip.tds + selectedSlip.lop).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                <span style={{ fontWeight: 600, color: '#065f46' }}>Net Pay</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>₹{selectedSlip.net.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ background: '#fafaf9', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => handleDownload(selectedSlip)} style={{ background: '#7B5EA7', border: 'none', color: '#fff', padding: '0.625rem 1.5rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

