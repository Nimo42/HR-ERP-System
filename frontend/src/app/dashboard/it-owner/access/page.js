'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from 'lucide-react';

const statusStyle = {
  Active: { color: '#059669', bg: '#d1fae5', label: 'Active' },
  Invited: { color: '#d97706', bg: '#fef3c7', label: 'Invited — Pending' },
  Deactivated: { color: '#6b7280', bg: '#f3f4f6', label: 'Deactivated' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AccessManagementPage() {
  const [hrs, setHrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', monthlySalary: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hr-managers');
      if (res.ok) setHrs((await res.json()).hrManagers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/hr-managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: '', email: '', monthlySalary: '', note: '' });
        notify('HR Manager invited successfully. They will receive an in-app invitation notification.');
        await load();
      } else notify(data.message || 'Failed to add HR Manager', true);
    } catch (e) { notify('An error occurred', true); }
    finally { setSubmitting(false); }
  };

  const action = async (id, act) => {
    setActionLoading(p => ({ ...p, [id + act]: true }));
    try {
      const res = await fetch('/api/admin/hr-managers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: act })
      });
      const data = await res.json();
      if (res.ok) { notify(data.message); await load(); }
      else notify(data.message || 'Action failed', true);
    } catch (e) { notify('An error occurred', true); }
    finally { setActionLoading(p => ({ ...p, [id + act]: false })); }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1f2937', maxWidth: 900 }}>

      {/* Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 460, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.375rem' }}>Add HR Manager</h2>
            <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
              An in-app invitation notification will be sent automatically.
            </p>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name *</label>
                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Priya Sharma"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => e.target.style.borderColor = '#7B5EA7'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Work Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="priya@company.com"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => e.target.style.borderColor = '#7B5EA7'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Salary (INR) *</label>
                <input required type="number" min="1" step="0.01" value={form.monthlySalary} onChange={e => setForm(p => ({ ...p, monthlySalary: e.target.value }))} placeholder="e.g. 80000"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => e.target.style.borderColor = '#7B5EA7'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note (optional)</label>
                <textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="e.g. Primary HR contact for engineering team" rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif' }}
                  onFocus={e => e.target.style.borderColor = '#7B5EA7'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '0.625rem 1.5rem', borderRadius: 9999, border: 'none', background: '#7B5EA7', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Sending invite…' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>HR Manager Accounts</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Manage who can operate the platform at the HR Manager level.</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: 'none', background: '#7B5EA7', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 4px 12px rgba(123,94,167,0.25)', transition: 'all 0.2s', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = '#6d4fa0'} onMouseLeave={e => e.currentTarget.style.background = '#7B5EA7'}>
          + Add HR Manager
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '0.875rem 1.25rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>{error}</div>
      )}
      {success && (
        <div style={{ padding: '0.875rem 1.25rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginBottom: '1.5rem', color: '#059669', fontSize: '0.875rem', fontWeight: 500 }}>{success}</div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f0ece6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 2fr 1.2fr 1fr 1.1fr 1.1fr auto', gap: '1rem', padding: '0.875rem 1.5rem', borderBottom: '1px solid #f0ece6', background: '#faf9f8' }}>
          {['Name', 'Email', 'Status', 'Salary', 'Created', 'Last Login', 'Actions'].map((h, i) => (
            <div key={i} style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Loading accounts…</div>
        ) : hrs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center', color: '#d1d5db' }}>
              <User size={40} />
            </div>
            <p style={{ color: '#6b7280', fontWeight: 500, fontSize: '0.875rem', margin: 0 }}>No HR Managers yet.</p>
            <p style={{ color: '#9ca3af', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>Add one using the button above to grant platform access.</p>
          </div>
        ) : (
          hrs.map((hr, i) => {
            const s = statusStyle[hr.status] || statusStyle.Active;
            return (
              <div key={hr.id} style={{ display: 'grid', gridTemplateColumns: '1.7fr 2fr 1.2fr 1fr 1.1fr 1.1fr auto', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < hrs.length - 1 ? '1px solid #f9f8f7' : 'none', alignItems: 'center', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#faf9f8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{hr.name}</div>
                  {hr.employeeId && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#4b5563', background: '#f3f4f6', padding: '0.0625rem 0.375rem', borderRadius: 4 }}>
                      {hr.employeeId}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hr.email}</div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.color, background: s.bg, padding: '0.25rem 0.625rem', borderRadius: 6 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#4b5563', fontWeight: 600 }}>
                  {hr.monthlySalary ? `INR ${Number(hr.monthlySalary).toLocaleString('en-IN')}` : '-'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{fmtDate(hr.createdAt)}</div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{fmtDate(hr.lastLogin)}</div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  {hr.status === 'Invited' && (
                    <ActionBtn label="Resend" loading={actionLoading[hr.id + 'resend-invite']} onClick={() => action(hr.id, 'resend-invite')} color="#d97706" />
                  )}
                  {hr.status === 'Active' && (
                    <ActionBtn label="Deactivate" loading={actionLoading[hr.id + 'deactivate']} onClick={() => { if (confirm(`Deactivate ${hr.name}?`)) action(hr.id, 'deactivate'); }} color="#dc2626" />
                  )}
                  {hr.status === 'Deactivated' && (
                    <ActionBtn label="Reactivate" loading={actionLoading[hr.id + 'reactivate']} onClick={() => action(hr.id, 'reactivate')} color="#059669" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem', fontStyle: 'italic' }}>
        Records are never deleted — deactivated accounts are retained for audit trail integrity.
      </p>
    </div>
  );
}

function ActionBtn({ label, onClick, loading, color }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ padding: '0.375rem 0.875rem', borderRadius: 8, border: `1px solid ${color}22`, background: `${color}11`, color, fontSize: '0.75rem', fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = `${color}22`; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = `${color}11`; }}>
      {loading ? '…' : label}
    </button>
  );
}
