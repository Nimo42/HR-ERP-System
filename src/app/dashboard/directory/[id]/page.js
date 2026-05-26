'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  User, Briefcase, FileText, CreditCard,
  ArrowLeft, Building2, Calendar, Edit3, Save, X, Upload, Download, UserCheck
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
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

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
          setManagers((empsData.employees || []).filter(e => e.role === 'Manager' || e.role === 'HR Manager' || e.role === 'IT Owner'));
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
  const isManager = currentUser.role === 'Manager';

  // Determine what tabs to show: standard managers don't see finances tab
  const tabs = [
    { id: 'about', label: 'About', icon: User },
    { id: 'job', label: 'Job', icon: Briefcase },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];
  if (isHR || isSelf) {
    tabs.push({ id: 'finances', label: 'Finances', icon: CreditCard });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = isHR ? {
        name: form.name,
        emergencyContact: form.emergencyContact,
        joinDate: form.joinDate,
        probationEnd: form.probationEnd,
        departmentId: form.departmentId || form.department?.id,
        managerId: form.managerId || form.manager?.id,
        bankDetails: form.bankDetails
      } : {
        // Employees can only edit emergency contact
        emergencyContact: form.emergencyContact
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
      } else {
        setError(data.message || 'Save failed');
      }
    } catch (e) {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
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

      {/* Tabs */}
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
            <Field label="Full Name" value={form.name} editing={editing && isHR} onChange={v => setForm(p => ({ ...p, name: v }))} />
            <Field label="Email" value={employee.email} editing={false} readOnly />
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
            {editing && isHR ? (
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
              {isHR ? 'HR Admins have full access to edit finances details.' : 'Account details are masked. Contact HR to edit.'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
              <Field label="Account Holder Name" value={form.bankDetails?.accountName} editing={editing && isHR} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), accountName: v } }))} />
              <Field label="Bank Name" value={form.bankDetails?.bankName} editing={editing && isHR} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), bankName: v } }))} />
              <Field label="Account Number" value={editing && isHR ? form.bankDetails?.accountNumber : (employee.bankDetails?.accountNumberMasked || form.bankDetails?.accountNumber)} editing={editing && isHR} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), accountNumber: v } }))} />
              <Field label="IFSC Code" value={form.bankDetails?.ifscCode} editing={editing && isHR} onChange={v => setForm(p => ({ ...p, bankDetails: { ...(p.bankDetails || {}), ifscCode: v } }))} />
            </div>
          </div>
        )}
      </div>
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

      {employee.documents?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#fafaf9', borderRadius: 12 }}>
          <FileText size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
          <p>No documents uploaded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {employee.documents?.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: '#fafaf9', borderRadius: 10, border: '1px solid #f0ece6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={18} color="#7B5EA7" />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.type}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#7B5EA7', fontSize: '0.8125rem', fontWeight: 500 }}>
                <Download size={14} /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
