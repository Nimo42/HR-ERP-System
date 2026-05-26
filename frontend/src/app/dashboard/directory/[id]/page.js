'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  User, Briefcase, FileText, CreditCard,
  ArrowLeft, Building2, Calendar, Edit3, Save, X, Upload, Download, UserCheck,
  ShieldCheck, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

export default function UnifiedProfile() {
  const { id } = useParams();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  // Reason modal for sensitive field change requests
  const [pendingFields, setPendingFields] = useState([]); // fields that changed and need a reason
  const [reasonModal, setReasonModal] = useState(false); // show the reason input modal
  const [fieldReasons, setFieldReasons] = useState({}); // {fieldKey: reason}

  useEffect(() => {
    async function load() {
      try {
        const [meRes, empRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch(`/api/employees/${id}`)
        ]);

        const meData = await meRes.json();
        setCurrentUser(meData.user);

        const empData = await empRes.json();
        if (empRes.ok) {
          setEmployee(empData.employee);
          setForm(empData.employee || {});
        } else {
          setError(empData.message || 'Access Denied');
        }

        // HR can see departments and managers to re-assign
        if (['HR Manager', 'IT Owner'].includes(meData.user?.role)) {
          const [deptsRes, empsRes] = await Promise.all([
            fetch('/api/departments'),
            fetch('/api/employees')
          ]);
          const deptsData = await deptsRes.json();
          const empsData = await empsRes.json();
          setDepartments(deptsData.departments || []);
          setManagers((empsData.employees || []).filter(e => e.role === 'HR Manager' || e.role === 'IT Owner'));
        } else {
          // Self users can edit/select their own department
          const deptsRes = await fetch('/api/departments');
          const deptsData = await deptsRes.json();
          setDepartments(deptsData.departments || []);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Profile...</div>;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{error}</div>;
  if (!employee || !currentUser) return null;

  const isHR = ['HR Manager', 'IT Owner'].includes(currentUser.role);
  const isSelf = currentUser.id === employee.id;

  // Determine what tabs to show
  const tabs = [
    { id: 'about', label: 'About', icon: User },
  ];
  // HR/Owner see job tab for all; employees see their own job info too
  if (isHR || isSelf) {
    tabs.push({ id: 'job', label: 'Job Info', icon: Briefcase });
  } else if (!isSelf) {
    tabs.push({ id: 'job', label: 'Job', icon: Briefcase });
  }
  tabs.push({ id: 'documents', label: 'Documents', icon: FileText });
  if (isHR || isSelf) {
    tabs.push({ id: 'finances', label: 'Finances', icon: CreditCard });
  }
  // Policy acknowledgements — visible to self and HR
  if (isSelf || isHR) {
    tabs.push({ id: 'policies', label: 'Policies', icon: ShieldCheck });
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      if (isHR) {
        const payload = {
          name: form.name,
          emergencyContact: form.emergencyContact,
          joinDate: form.joinDate,
          probationEnd: form.probationEnd,
          departmentId: form.departmentId || form.department?.id,
          managerId: form.managerId || form.manager?.id,
          bankDetails: form.bankDetails,
          isRemoteEligible: !!form.isRemoteEligible
        };

        const res = await fetch(`/api/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          setEmployee(data.employee || { ...employee, ...form });
          setEditing(false);
          setSuccess('Profile updated successfully.');
          setTimeout(() => setSuccess(''), 4000);
        } else {
          setError(data.message || 'Save failed');
        }
      } else {
        // Employee/self save
        const patchRes = await fetch(`/api/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            emergencyContact: form.emergencyContact,
            departmentId: form.departmentId || form.department?.id || null,
            joinDate: form.joinDate,
            probationEnd: form.probationEnd,
            bankDetails: form.bankDetails
          })
        });
        const patchData = await patchRes.json();
        if (!patchRes.ok) throw new Error(patchData.message || 'Save failed');

        setEmployee(patchData.employee || { ...employee, ...form });
        setEditing(false);
        setForm({ ...(patchData.employee || employee), ...form });
        setSuccess('Profile updated successfully.');
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function submitReasonModal() {
    const fieldsToRequest = pendingFields.map(f => ({
      field: f.field,
      oldValue: f.oldValue,
      newValue: f.newValue,
      reason: fieldReasons[f.field] || ''
    })).filter(f => f.reason);

    if (fieldsToRequest.length === 0) {
      setReasonModal(false);
      return;
    }

    try {
      const reqRes = await fetch('/api/profile-edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsToRequest })
      });
      if (reqRes.ok) {
        setSuccess(`Change request for ${fieldsToRequest.map(f => f.field).join(', ')} submitted to HR for approval.`);
        setTimeout(() => setSuccess(''), 6000);
      }
    } catch (err) {
      console.error(err);
    }
    setReasonModal(false);
  }

  const initials = employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Back to directory (only for managers & HR) */}
      {!isSelf && (
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#7B5EA7', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Directory
        </button>
      )}

      {/* Employee self-view welcome */}
      {isSelf && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>My Profile</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.375rem' }}>Manage your personal information, documents, and company policies.</p>
        </div>
      )}

      {/* Header Card */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f0ece6', padding: '2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #7B5EA7, #a78bde)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.5rem', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{employee.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: '#6b7280' }}>
            <span>{employee.email}</span>
            <span style={{ padding: '0.125rem 0.625rem', borderRadius: 999, background: '#f3e8ff', color: '#7c3aed', fontWeight: 600, fontSize: '0.75rem' }}>{employee.role}</span>
            {employee.department && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={14} />{employee.department.name}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(isHR || isSelf) && (
            editing ? (
              <>
                <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                  <Save size={14} />{saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setForm(employee); }} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <X size={14} /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                <Edit3 size={14} /> Edit
              </button>
            )
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.875rem 1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.875rem 1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: '#f9f8f7', borderRadius: 12, padding: '0.25rem', width: 'fit-content' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: active ? '#fff' : 'transparent',
              color: active ? '#7B5EA7' : '#6b7280',
              fontWeight: active ? 600 : 400,
              fontSize: '0.875rem',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s'
            }}>
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0ece6', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {activeTab === 'about' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
            <Field label="Full Name" value={form.name} editing={editing && (isHR || isSelf)} onChange={v => setForm(p => ({ ...p, name: v }))} />
            <Field label="Email" value={employee.email} editing={false} readOnly />
            <Field label="Employee ID" value={employee.employeeId} editing={false} readOnly />
            <Field label="Role" value={employee.role} editing={false} readOnly />
            <Field label="Department" value={employee.department?.name} editing={false} readOnly />
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Emergency Contact" value={form.emergencyContact} editing={editing && (isHR || isSelf)}
                onChange={v => setForm(p => ({ ...p, emergencyContact: v }))} />
            </div>
          </div>
        )}

        {activeTab === 'job' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
            {editing && (isHR || isSelf) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Department</label>
                <select value={form.departmentId || form.department?.id || ''} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fafaf9' }}>
                  <option value="">No Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            ) : (
              <Field label="Department" value={employee.department?.name} editing={false} readOnly />
            )}

            <Field label="Role" value={employee.role} editing={false} readOnly />

            {editing && isHR ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Reporting Manager</label>
                <select value={form.managerId || form.manager?.id || ''} onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fafaf9' }}>
                  <option value="">No Manager</option>
                  {managers.filter(m => m.id !== id).map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
            ) : (
              <Field label="Reporting Manager" value={employee.manager?.name} editing={false} readOnly />
            )}

            <Field label="Join Date" value={form.joinDate ? new Date(form.joinDate).toISOString().slice(0, 10) : ''} type="date" editing={editing && isHR}
              onChange={v => setForm(p => ({ ...p, joinDate: v }))} />
            <Field label="Probation End" value={form.probationEnd ? new Date(form.probationEnd).toISOString().slice(0, 10) : ''} type="date" editing={editing && isHR}
              onChange={v => setForm(p => ({ ...p, probationEnd: v }))} />

            {editing && isHR ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Work From Home Eligibility</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    id="isRemoteEligible"
                    checked={!!form.isRemoteEligible}
                    onChange={e => setForm(p => ({ ...p, isRemoteEligible: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7B5EA7' }}
                  />
                  <label htmlFor="isRemoteEligible" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                    Eligible for Remote Work
                  </label>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Work From Home Eligibility</label>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: employee.isRemoteEligible ? '#059669' : '#374151' }}>
                  {employee.isRemoteEligible ? 'Eligible' : 'Not Eligible'}
                </div>
              </div>
            )}

            {employee.directReports?.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Direct Reports</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {employee.directReports.map(r => (
                    <span key={r.id} style={{ padding: '0.25rem 0.75rem', background: '#f3e8ff', color: '#7c3aed', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 500 }}>{r.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsTab employee={employee} employeeId={id} onRefresh={() => { fetch(`/api/employees/${id}`).then(r => r.json()).then(d => setEmployee(d.employee)); }} />
        )}

        {activeTab === 'finances' && (
          <div>
            <div style={{ background: '#fef9f0', border: '1px solid #fde68a', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: '#92400e' }}>
              {isHR ? 'HR Admins have full access to edit finances details.' : 'Account details are masked. Edits will be sent to HR for approval.'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
              <Field label="Account Holder Name" value={form.bankDetails?.accountName} editing={editing && (isHR || isSelf)} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), accountName: v } }))} />
              <Field label="Bank Name" value={form.bankDetails?.bankName} editing={editing && (isHR || isSelf)} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), bankName: v } }))} />
              <Field label="Account Number" value={(editing && (isHR || isSelf)) ? form.bankDetails?.accountNumber : (employee.bankDetails?.accountNumberMasked || form.bankDetails?.accountNumber)} editing={editing && (isHR || isSelf)} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), accountNumber: v } }))} />
              <Field label="IFSC Code" value={form.bankDetails?.ifscCode} editing={editing && (isHR || isSelf)} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), ifscCode: v } }))} />
            </div>
          </div>
        )}
        {activeTab === 'policies' && (
          <PoliciesTab />
        )}
      </div>

      {/* Reason Modal for sensitive field change requests */}
      {reasonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>Submit Change Request to HR</h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>The following fields require HR approval. Please provide a reason for each change.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {pendingFields.map(f => (
                <div key={f.field}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>
                    Reason for changing <span style={{ color: '#7B5EA7' }}>{f.label}</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Legal name change, Bank account update"
                    value={fieldReasons[f.field] || ''}
                    onChange={e => setFieldReasons(prev => ({ ...prev, [f.field]: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setReasonModal(false)} style={{ padding: '0.625rem 1.25rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#374151', fontSize: '0.875rem' }}>Skip</button>
              <button onClick={submitReasonModal} style={{ padding: '0.625rem 1.25rem', background: '#7B5EA7', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#fff', fontSize: '0.875rem' }}>Submit to HR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, editing, onChange, type = 'text', readOnly = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {editing && !readOnly ? (
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', background: '#fafaf9' }} />
      ) : (
        <div style={{ fontSize: '0.9375rem', color: value ? '#1a1a1a' : '#d1d5db', fontWeight: value ? 500 : 400 }}>
          {value || '—'}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ employee, employeeId, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('ID Proof');

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employeeId', employeeId);
      formData.append('type', docType);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      if (res.ok) onRefresh();
    } finally { setUploading(false); }
  }

  async function handleDownload(doc) {
    try {
      const res = await fetch(doc.fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.type}_${new Date(doc.uploadedAt).toLocaleDateString('en-IN').replace(/\//g, '-')}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
          {['ID Proof', 'Offer Letter', 'Appraisal', 'Medical', 'Other'].map(t => <option key={t}>{t}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#7B5EA7', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {!employee.documents?.length ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#fafaf9', borderRadius: 12 }}>
          <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p>No documents uploaded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {employee.documents.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: '#fafaf9', borderRadius: 10, border: '1px solid #f0ece6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={18} color="#7B5EA7" />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.type}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
              <button onClick={() => handleDownload(doc)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#7B5EA7', fontSize: '0.8125rem', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                <Download size={14} /> Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PoliciesTab() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ackLoading, setAckLoading] = useState({});
  const [ackSuccess, setAckSuccess] = useState({});

  useEffect(() => {
    fetch('/api/compliance/policies')
      .then(r => r.json())
      .then(d => { setPolicies(d.policies || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function acknowledge(policyId) {
    setAckLoading(prev => ({ ...prev, [policyId]: true }));
    try {
      const res = await fetch('/api/compliance/acknowledgements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId })
      });
      if (res.ok) {
        setAckSuccess(prev => ({ ...prev, [policyId]: true }));
        setPolicies(prev => prev.map(p => p.id === policyId ? { ...p, acknowledged: true } : p));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAckLoading(prev => ({ ...prev, [policyId]: false }));
    }
  }

  async function downloadPolicy(policy) {
    try {
      const res = await fetch(policy.fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Policy_${policy.title.replace(/\s+/g, '_')}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading policies...</div>;

  const pending = policies.filter(p => p.readReceiptRequired && !p.acknowledged);
  const others = policies.filter(p => !p.readReceiptRequired || p.acknowledged);

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertCircle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
            <strong>Action required:</strong> You have {pending.length} polic{pending.length > 1 ? 'ies' : 'y'} that require{pending.length === 1 ? 's' : ''} your acknowledgement.
          </div>
        </div>
      )}

      {policies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <ShieldCheck size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
          <p>No company policies published yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...pending, ...others].map(policy => (
            <div key={policy.id} style={{ border: `1px solid ${(!policy.acknowledged && policy.readReceiptRequired) ? '#fcd34d' : '#e5e7eb'}`, borderRadius: 12, padding: '1.25rem', background: (!policy.acknowledged && policy.readReceiptRequired) ? '#fffbeb' : '#fafaf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.375rem' }}>{policy.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {policy.readReceiptRequired && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: 999, background: policy.acknowledged ? '#d1fae5' : '#fee2e2', color: policy.acknowledged ? '#065f46' : '#b91c1c' }}>
                      {policy.acknowledged ? 'Acknowledged' : 'Requires Acknowledgement'}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(policy.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => downloadPolicy(policy)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                  <Download size={14} /> Download
                </button>
                {policy.readReceiptRequired && !policy.acknowledged && (
                  <button
                    onClick={() => acknowledge(policy.id)}
                    disabled={ackLoading[policy.id]}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: '#7B5EA7', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: ackLoading[policy.id] ? 0.7 : 1 }}
                  >
                    <CheckCircle2 size={14} /> {ackLoading[policy.id] ? 'Submitting...' : 'I have read this'}
                  </button>
                )}
                {policy.acknowledged && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#059669', fontSize: '0.8125rem', fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> Done
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
