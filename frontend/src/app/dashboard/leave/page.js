'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Plus, Settings, CalendarDays, Edit, Trash2 } from 'lucide-react';
import EmployeeLeaveView from '../../../components/EmployeeLeaveView';

const STATUS_STYLES = {
  Pending:  { bg: '#fef9c3', text: '#854d0e', icon: Clock },
  Approved: { bg: '#d1fae5', text: '#065f46', icon: CheckCircle2 },
  Rejected: { bg: '#fee2e2', text: '#991b1b', icon: XCircle },
};

export default function UnifiedLeaveDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Common leave lists
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // Filters for HR & Manager approval view
  const [filter, setFilter] = useState('Pending');

  // Switch tabs for HR Manager
  const [activeHRView, setActiveHRView] = useState('approvals'); // approvals | config

  // Employee apply leave form modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Leave Type Form State (HR Config)
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeName, setTypeName] = useState('');
  const [typeQuota, setTypeQuota] = useState(12);
  const [typeCarryForward, setTypeCarryForward] = useState(false);
  const [typeAdvanceNotice, setTypeAdvanceNotice] = useState(0);
  const [typeIsEmergency, setTypeIsEmergency] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      if (meData.user?.role === 'Employee') {
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
      } else {
        // HR Manager / Admin
        const url = filter === 'All' ? '/api/leaves' : `/api/leaves?status=${filter}`;
        const res = await fetch(url);
        const data = await res.json();
        setRequests(data.requests || []);

        const typesRes = await fetch('/api/leaves/types');
        const typesData = await typesRes.json();
        setLeaveTypes(typesData.leaveTypes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [filter, activeHRView]);

  // Leave approval action (Approve/Reject)
  async function handleApprove(id, status) {
    await fetch(`/api/leaves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadData();
  }

  // Employee Apply Submit
  async function handleApplySubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applyForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Leave request submitted successfully!');
        setShowApplyModal(false);
        setApplyForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
        loadData();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.message || 'Failed to submit leave request');
      }
    } catch (e) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  // Save Configured Leave Type (HR)
  async function handleSaveType(e) {
    e.preventDefault();
    const payload = {
      name: typeName,
      quota: parseInt(typeQuota),
      carryForward: typeCarryForward,
      advanceNotice: parseInt(typeAdvanceNotice),
      isEmergency: typeIsEmergency
    };

    const url = editingType ? `/api/leaves/types/${editingType.id}` : '/api/leaves/types';
    const method = editingType ? 'PATCH' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setShowTypeModal(false);
    setEditingType(null);
    clearTypeForm();
    loadData();
  }

  function clearTypeForm() {
    setTypeName('');
    setTypeQuota(12);
    setTypeCarryForward(false);
    setTypeAdvanceNotice(0);
    setTypeIsEmergency(false);
  }

  function handleEditType(type) {
    setEditingType(type);
    setTypeName(type.name);
    setTypeQuota(type.quota);
    setTypeCarryForward(type.carryForward);
    setTypeAdvanceNotice(type.advanceNotice);
    setTypeIsEmergency(type.isEmergency);
    setShowTypeModal(true);
  }

  async function handleDeleteType(id) {
    if (confirm('Delete this leave type? All balances and history will be cleared.')) {
      await fetch(`/api/leaves/types/${id}`, { method: 'DELETE' });
      loadData();
    }
  }

  if (loading && !currentUser) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Leave Dashboard...</div>;

  const isHR = ['HR Manager', 'Admin'].includes(currentUser?.role);

  return (
    <div style={{ maxWidth: '1200px' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Leave Workspace</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            {currentUser?.role === 'Employee' ? 'Apply for leave and track your balances.' : 'Manage, review, and configure leave structures.'}
          </p>
        </div>

        {/* HR Tab Switcher */}
        {isHR && (
          <div style={{ display: 'flex', gap: '0.25rem', background: '#f0ece6', padding: '0.25rem', borderRadius: 10 }}>
            <button onClick={() => setActiveHRView('approvals')} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: activeHRView === 'approvals' ? '#fff' : 'transparent',
              color: activeHRView === 'approvals' ? '#7B5EA7' : '#4b5563',
              fontWeight: activeHRView === 'approvals' ? 600 : 500, fontSize: '0.875rem',
              boxShadow: activeHRView === 'approvals' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.15s'
            }}>
              <CalendarDays size={16} /> Approvals
            </button>
            <button onClick={() => setActiveHRView('config')} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: activeHRView === 'config' ? '#fff' : 'transparent',
              color: activeHRView === 'config' ? '#7B5EA7' : '#4b5563',
              fontWeight: activeHRView === 'config' ? 600 : 500, fontSize: '0.875rem',
              boxShadow: activeHRView === 'config' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.15s'
            }}>
              <Settings size={16} /> Configure Rules
            </button>
          </div>
        )}

        {/* Employee Apply button â€” now handled inside EmployeeLeaveView, title block only for HR */}
      </div>

      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* ==================== 1. EMPLOYEE VIEW ==================== */}
      {!isHR && (
        <EmployeeLeaveView />
      )}

      {/* ==================== 2. HR APPROVAL VIEW ==================== */}
      {isHR && activeHRView === 'approvals' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '0.5rem 1.25rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: filter === s ? '#1a1a1a' : '#f0ece6',
                color: filter === s ? '#fff' : '#4b5563',
                fontWeight: filter === s ? 600 : 400, fontSize: '0.875rem', transition: 'all 0.15s'
              }}>{s}</button>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {requests.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No {filter.toLowerCase()} leave requests found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f0ece6' }}>
                    {['Employee', 'Leave Type', 'Duration', 'Days', 'Reason', 'Status', filter === 'Pending' ? 'Actions' : ''].filter(Boolean).map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => {
                    const days = Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1;
                    const ss = STATUS_STYLES[req.status] || STATUS_STYLES.Pending;
                    const Icon = ss.icon;
                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #fafaf9' }}>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{req.user?.name}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>{req.leaveType?.name}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#4b5563', whiteSpace: 'nowrap' }}>
                          {new Date(req.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} â€” {new Date(req.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{days}d</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#6b7280' }}>{req.reason}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: ss.bg, color: ss.text }}>
                            <Icon size={12} />{req.status}
                          </span>
                        </td>
                        {filter === 'Pending' && (
                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => handleApprove(req.id, 'Approved')} style={{ padding: '0.3rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' }}>Approve</button>
                              <button onClick={() => handleApprove(req.id, 'Rejected')} style={{ padding: '0.3rem 0.75rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem' }}>Reject</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ==================== 3. HR CONFIG RULES VIEW ==================== */}
      {isHR && activeHRView === 'config' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Configured Leave Rules</h2>
            <button onClick={() => { clearTypeForm(); setEditingType(null); setShowTypeModal(true); }} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#7B5EA7', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
            }}>
              <Plus size={16} /> Add Leave Type
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {leaveTypes.map(type => (
              <div key={type.id} style={{
                background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>{type.name}</h3>
                    {type.isEmergency && <span style={{ padding: '0.2rem 0.5rem', background: '#fee2e2', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, borderRadius: 6 }}>Emergency</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Annual Quota:</span>
                      <strong style={{ color: '#111827' }}>{type.quota} days</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Carry Forward:</span>
                      <strong style={{ color: '#111827' }}>{type.carryForward ? 'Enabled' : 'Disabled'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Notice Required:</span>
                      <strong style={{ color: '#111827' }}>{type.advanceNotice > 0 ? `${type.advanceNotice} days` : 'Immediate'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #fafaf9', paddingTop: '1rem' }}>
                  <button onClick={() => handleEditType(type)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>
                    <Edit size={14} /> Edit
                  </button>
                  <button onClick={() => handleDeleteType(type.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', border: '1px solid #fee2e2', borderRadius: 8, background: '#fee2e2', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== 4. APPLY LEAVE MODAL ==================== */}
      {showApplyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Apply for Leave</h2>
              <button onClick={() => setShowApplyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><XCircle size={20} /></button>
            </div>

            {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Leave Type</label>
                <select required value={applyForm.leaveTypeId} onChange={e => setApplyForm(p => ({ ...p, leaveTypeId: e.target.value }))}
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                  <option value="">Select type...</option>
                  {leaveTypes.map(t => {
                    const bal = balances.find(b => b.leaveTypeId === t.id);
                    return <option key={t.id} value={t.id}>{t.name} {bal ? `(${bal.balance} left)` : ''}</option>;
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>From</label>
                  <input type="date" required value={applyForm.startDate} onChange={e => setApplyForm(p => ({ ...p, startDate: e.target.value }))}
                    style={{ padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>To</label>
                  <input type="date" required value={applyForm.endDate} onChange={e => setApplyForm(p => ({ ...p, endDate: e.target.value }))}
                    style={{ padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Reason</label>
                <textarea required rows={3} value={applyForm.reason} onChange={e => setApplyForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Brief reason for leave..."
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <button type="submit" disabled={submitting}
                style={{ padding: '0.875rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 5. HR CONFIG RULE MODAL ==================== */}
      {showTypeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '450px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>{editingType ? 'Edit Rule' : 'Add Leave Type Rule'}</h2>
            <form onSubmit={handleSaveType} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Name</label>
                <input required value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="e.g. Vacation Leave"
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Annual Quota</label>
                  <input type="number" required value={typeQuota} onChange={e => setTypeQuota(e.target.value)} min={0}
                    style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Advance Notice (Days)</label>
                  <input type="number" required value={typeAdvanceNotice} onChange={e => setTypeAdvanceNotice(e.target.value)} min={0}
                    style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#fafaf9', padding: '1rem', borderRadius: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={typeCarryForward} onChange={e => setTypeCarryForward(e.target.checked)} />
                  Enable Carry Forward
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={typeIsEmergency} onChange={e => setTypeIsEmergency(e.target.checked)} />
                  Emergency Leave (bypasses quota & notice)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowTypeModal(false); setEditingType(null); clearTypeForm(); }} style={{
                  flex: 1, padding: '0.625rem', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                }}>Cancel</button>
                <button type="submit" style={{
                  flex: 1, padding: '0.625rem', border: 'none', background: '#7B5EA7', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
