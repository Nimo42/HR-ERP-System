'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Plus, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Info } from 'lucide-react';

const STATUS_STYLES = {
  Pending:  { bg: '#fef9c3', text: '#854d0e', icon: Clock },
  Approved: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle2 },
  Rejected: { bg: '#fee2e2', text: '#991b1b', icon: XCircle },
};

export default function EmployeeLeaveView() {
  const [activeTab, setActiveTab] = useState('balance'); // 'balance' or 'history'
  
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply flow states
  const [showApply, setShowApply] = useState(false);
  const [applyStep, setApplyStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [workingDays, setWorkingDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const loadData = useCallback(async () => {
    try {
      const [reqRes, balRes, typesRes] = await Promise.all([
        fetch('/api/leaves'),
        fetch('/api/leaves?type=balances'),
        fetch('/api/leaves?type=types'),
      ]);
      const req = await reqRes.json();
      const bal = await balRes.json();
      const types = await typesRes.json();
      setRequests(req.requests || []);
      setBalances(bal.balances || []);
      setLeaveTypes(types.leaveTypes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Cancel Leave
  async function handleCancel(id) {
    if (!confirm('Are you sure you want to cancel this pending request?')) return;
    try {
      await fetch(`/api/leaves/${id}`, { method: 'DELETE' });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  // Multi-step Application Handlers
  function handleNextStep() {
    setError('');
    if (applyStep === 1) {
      if (!selectedType) return setError('Please select a leave type');
      setApplyStep(2);
    } else if (applyStep === 2) {
      if (!startDate || !endDate) return setError('Please select start and end dates');
      if (new Date(startDate) > new Date(endDate)) return setError('Start date must be before end date');
      
      // Calculate working days (skip weekends for now, ideally also skip holidays)
      let d = new Date(startDate);
      const e = new Date(endDate);
      let wd = 0;
      let overlap = false;
      
      while (d <= e) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) wd++;
        
        // Check overlap with approved leaves
        const dTime = d.getTime();
        requests.forEach(r => {
          if (r.status === 'Approved') {
            const rs = new Date(r.startDate).getTime();
            const re = new Date(r.endDate).getTime();
            if (dTime >= rs && dTime <= re) overlap = true;
          }
        });
        
        d.setDate(d.getDate() + 1);
      }

      if (overlap) return setError('Selected dates overlap with an existing approved leave.');
      
      setWorkingDays(wd);
      setApplyStep(3);
    } else if (applyStep === 3) {
      if (!reason.trim()) return setError('Please provide a reason');
      setApplyStep(4);
    }
  }

  async function handleSubmitApply() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveTypeId: selectedType.id,
          startDate,
          endDate,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit');
      
      setSuccess('Leave request submitted successfully.');
      setShowApply(false);
      setApplyStep(1);
      setSelectedType(null);
      setStartDate('');
      setEndDate('');
      setReason('');
      loadData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>My Leaves</h1>
        {!showApply && (
          <button onClick={() => setShowApply(true)} style={{ background: '#7B5EA7', color: '#fff', border: 'none', padding: '0.625rem 1.25rem', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <Plus size={16} /> Apply for Leave
          </button>
        )}
      </div>

      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.875rem 1rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {showApply ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Leave Application</h2>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>Step {applyStep} of 4</div>
          </div>

          {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

          {applyStep === 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Select Leave Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {balances.map(b => {
                  const balanceValue = toNumber(b?.balance, 0);
                  const isZero = balanceValue <= 0;
                  const isSel = selectedType?.id === b.leaveType.id;
                  return (
                    <div key={b.id} onClick={() => !isZero && setSelectedType(b.leaveType)} style={{ border: `1px solid ${isSel ? '#7B5EA7' : '#e5e7eb'}`, background: isSel ? '#fcfaff' : (isZero ? '#f9fafb' : '#fff'), padding: '1rem', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isZero ? 'not-allowed' : 'pointer', opacity: isZero ? 0.6 : 1 }}>
                      <div style={{ fontWeight: 600, color: '#374151' }}>{b.leaveType.name}</div>
                      <div style={{ fontSize: '0.875rem', color: isZero ? '#ef4444' : '#6b7280', fontWeight: 500 }}>
                        {isZero ? 'No balance' : `${balanceValue} days remaining`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {applyStep === 2 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Select Dates</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                </div>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Info size={14} /> Weekends and approved holidays will be automatically excluded from working days.
              </div>
            </div>
          )}

          {applyStep === 3 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Reason for Leave</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, resize: 'vertical' }} placeholder="Please provide a brief reason..." />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>This reason will be visible to your manager and HR.</div>
            </div>
          )}

          {applyStep === 4 && (
            <div>
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>Request Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div><span style={{ color: '#6b7280' }}>Leave Type:</span> <strong style={{ color: '#111827' }}>{selectedType?.name}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Working Days:</span> <strong style={{ color: '#111827' }}>{workingDays}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>From:</span> <strong style={{ color: '#111827' }}>{new Date(startDate).toLocaleDateString()}</strong></div>
                  <div><span style={{ color: '#6b7280' }}>To:</span> <strong style={{ color: '#111827' }}>{new Date(endDate).toLocaleDateString()}</strong></div>
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>Reason:</span> <span style={{ color: '#111827' }}>{reason}</span>
                </div>
              </div>

              {selectedType?.advanceNotice > 0 && (() => {
                const diffDays = Math.ceil((new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24));
                if (diffDays < selectedType.advanceNotice) {
                  return (
                    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', padding: '0.75rem 1rem', borderRadius: 8, display: 'flex', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      This leave type requires {selectedType.advanceNotice} days advance notice. Your request is short-notice. It can still be submitted but will be flagged for your manager.
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <button onClick={() => applyStep === 1 ? setShowApply(false) : setApplyStep(a => a - 1)} style={{ background: 'none', border: '1px solid #e5e7eb', padding: '0.625rem 1.25rem', borderRadius: 8, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
              {applyStep === 1 ? 'Cancel' : 'Back'}
            </button>
            {applyStep < 4 ? (
              <button onClick={handleNextStep} style={{ background: '#7B5EA7', border: 'none', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Continue
              </button>
            ) : (
              <button onClick={handleSubmitApply} disabled={submitting} style={{ background: '#7B5EA7', border: 'none', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: 8, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
            <button onClick={() => setActiveTab('balance')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'balance' ? '#7B5EA7' : 'transparent'}`, padding: '0.5rem 0', fontWeight: activeTab === 'balance' ? 600 : 500, color: activeTab === 'balance' ? '#7B5EA7' : '#6b7280', fontSize: '0.875rem', cursor: 'pointer' }}>My Balance</button>
            <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'history' ? '#7B5EA7' : 'transparent'}`, padding: '0.5rem 0', fontWeight: activeTab === 'history' ? 600 : 500, color: activeTab === 'history' ? '#7B5EA7' : '#6b7280', fontSize: '0.875rem', cursor: 'pointer' }}>My History</button>
          </div>

          {activeTab === 'balance' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                {balances.map(b => {
                  const allocation = toNumber(b?.leaveType?.quota, 0);
                  const balanceValue = toNumber(b?.balance, 0);
                  const used = Math.max(0, allocation - balanceValue);
                  return (
                    <div key={b.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#374151', marginBottom: '1rem', fontSize: '1rem' }}>{b.leaveType.name}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{balanceValue}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>remaining</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Allocation:</span> <span style={{ fontWeight: 600, color: '#374151' }}>{allocation}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Taken so far:</span> <span style={{ fontWeight: 600, color: '#374151' }}>{used}</span></div>
                        {b.leaveType.carryForward && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Carry Forward:</span> <span style={{ fontWeight: 600, color: '#374151' }}>Yes</span></div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Simple read-only calendar legend representation for demo */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Approved Leaves</h3>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {requests.filter(r => r.status === 'Approved').length === 0 ? 'No approved leaves to show.' : 
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {requests.filter(r => r.status === 'Approved').slice(0, 5).map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CalendarIcon size={14} />
                          <span style={{ fontWeight: 500, color: '#374151' }}>{r.leaveType.name}:</span>
                          <span>{new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Leave Type</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Dates</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No leave history found.</td>
                    </tr>
                  ) : (
                    requests.map(r => {
                      const st = STATUS_STYLES[r.status] || STATUS_STYLES.Pending;
                      const Icon = st.icon;
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#111827', fontSize: '0.875rem' }}>{r.leaveType?.name}</td>
                          <td style={{ padding: '1rem 1.25rem', color: '#6b7280', fontSize: '0.875rem' }}>
                            {new Date(r.startDate).toLocaleDateString('en-IN')} – {new Date(r.endDate).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: st.bg, color: st.text, padding: '0.25rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                              <Icon size={12} /> {r.status}
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            {r.status === 'Pending' && (
                              <button onClick={() => handleCancel(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
