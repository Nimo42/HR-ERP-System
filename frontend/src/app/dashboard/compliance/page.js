'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, FileText, Send, AlertOctagon, UserCheck, ShieldAlert } from 'lucide-react';

export default function UnifiedCompliance() {
  const [currentUser, setCurrentUser] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states (HR uploads policy)
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyFileUrl, setPolicyFileUrl] = useState('');
  const [receiptRequired, setReceiptRequired] = useState(true);

  // Form states (HR issues warning)
  const [warningEmpId, setWarningEmpId] = useState('');
  const [warningType, setWarningType] = useState('Verbal');
  const [warningDetails, setWarningDetails] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const polRes = await fetch('/api/compliance/policies');
      const polData = await polRes.json();
      setPolicies(polData.policies || []);

      const warnRes = await fetch('/api/compliance/warnings');
      const warnData = await warnRes.json();
      setWarnings(warnData.warnings || []);

      if (['HR Manager', 'Admin'].includes(meData.user?.role)) {
        const empRes = await fetch('/api/employees');
        const empData = await empRes.json();
        setEmployees(empData.employees || []);
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

  async function handleAcknowledge(policyId) {
    try {
      const res = await fetch('/api/compliance/acknowledgements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId })
      });
      if (res.ok) {
        setFormSuccess('Policy receipt acknowledged!');
        loadData();
        setTimeout(() => setFormSuccess(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreatePolicy(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/compliance/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: policyTitle,
          fileUrl: policyFileUrl,
          readReceiptRequired: receiptRequired
        })
      });
      if (res.ok) {
        setFormSuccess('Policy document uploaded and published.');
        setPolicyTitle('');
        setPolicyFileUrl('');
        loadData();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        const d = await res.json();
        setFormError(d.message || 'Failed to upload policy');
      }
    } catch (err) {
      setFormError('Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIssueWarning(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/compliance/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: warningEmpId,
          type: warningType,
          customDetails: warningDetails
        })
      });
      if (res.ok) {
        setFormSuccess('Warning letter issued and dispatched via email.');
        setWarningEmpId('');
        setWarningDetails('');
        loadData();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        const d = await res.json();
        setFormError(d.message || 'Failed to issue warning');
      }
    } catch (err) {
      setFormError('Failed to issue warning');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Compliance logs...</div>;

  const isHR = ['HR Manager', 'Admin'].includes(currentUser?.role);
  const pendingReceipts = policies.filter(p => p.readReceiptRequired && !p.acknowledged);

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Compliance & Legal</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
          {isHR ? 'Upload official policies, monitor read-receipts, and issue formal warning letters.' : 'Review company code of conduct documents and warnings logs.'}
        </p>
      </div>

      {formError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <ShieldAlert size={16} /> {formError}
        </div>
      )}
      {formSuccess && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <ShieldCheck size={16} /> {formSuccess}
        </div>
      )}

      {/* Action alert banner for employees */}
      {!isHR && pendingReceipts.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#b45309' }}>
          <AlertOctagon size={20} color="#d97706" />
          <div style={{ fontSize: '0.875rem', flex: 1 }}>
            <strong>Action Required:</strong> You have <strong>{pendingReceipts.length}</strong> official policies that require reading and receipt acknowledgement.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isHR ? '1fr 1fr' : '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Side: Policies & Warning lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Policy Library */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="#7B5EA7" /> Company Policy Library
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {policies.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No policies uploaded yet.</p>
              ) : policies.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: '#fafaf9', borderRadius: 10, border: '1px solid #f0ece6' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.title}</div>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Published: {new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {p.readReceiptRequired && (
                      p.acknowledged ? (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, background: '#d1fae5', padding: '0.2rem 0.5rem', borderRadius: 6 }}>Receipt Logged</span>
                      ) : (
                        <button onClick={() => handleAcknowledge(p.id)} style={{
                          padding: '0.3rem 0.75rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                        }}>Acknowledge</button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings List */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color="#ef4444" /> Compliance Notice History
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {warnings.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No compliance warnings issued.</p>
              ) : warnings.map(w => {
                const badgeColor = w.type === 'ShowCause' ? '#fee2e2' : w.type === 'Written' ? '#ffedd5' : '#fef9c3';
                const textColor = w.type === 'ShowCause' ? '#991b1b' : w.type === 'Written' ? '#c2410c' : '#854d0e';
                return (
                  <div key={w.id} style={{ padding: '1rem', background: '#fafaf9', borderRadius: 10, border: '1px solid #f0ece6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', background: badgeColor, color: textColor, fontWeight: 700, fontSize: '0.75rem', borderRadius: 6 }}>
                        {w.type} Notice
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(w.sentAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    {isHR && <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Employee: {w.user?.name}</div>}
                    <div style={{ fontSize: '0.8125rem', color: '#4b5563', whiteSpace: 'pre-line' }}>{w.content}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: HR upload forms */}
        {isHR && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Upload Policy Card */}
            <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="#7B5EA7" /> Publish Policy Document
              </h2>
              <form onSubmit={handleCreatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Policy Title</label>
                  <input required value={policyTitle} onChange={e => setPolicyTitle(e.target.value)} placeholder="e.g. Code of Conduct Policy 2026"
                    style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Document File Path</label>
                  <input required value={policyFileUrl} onChange={e => setPolicyFileUrl(e.target.value)} placeholder="e.g. /uploads/policies/conduct.pdf"
                    style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', margin: '0.25rem 0' }}>
                  <input type="checkbox" checked={receiptRequired} onChange={e => setReceiptRequired(e.target.checked)} />
                  Require Read-Receipt Acknowledgement
                </label>
                <button type="submit" disabled={submitting} style={{
                  padding: '0.625rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                }}>Publish Document</button>
              </form>
            </div>

            {/* Issue Warning Letter Card */}
            <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} color="#7B5EA7" /> Issue Warning Letter
              </h2>
              <form onSubmit={handleIssueWarning} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Select Employee</label>
                  <select required value={warningEmpId} onChange={e => setWarningEmpId(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                    <option value="">Choose employee...</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Warning Type</label>
                  <select value={warningType} onChange={e => setWarningType(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                    {['Verbal', 'Written', 'ShowCause'].map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Reason / Notes Details</label>
                  <textarea required rows={3} value={warningDetails} onChange={e => setWarningDetails(e.target.value)} placeholder="Incident details and metrics missed..."
                    style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <button type="submit" disabled={submitting} style={{
                  padding: '0.625rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                }}>Dispatch Notice</button>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
