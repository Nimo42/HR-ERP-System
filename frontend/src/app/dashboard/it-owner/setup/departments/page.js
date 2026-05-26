'use client';

import { useState, useEffect } from 'react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/org-settings')
      .then(res => res.json())
      .then(d => {
        if (d.departments) setDepartments(d.departments);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = editDept 
        ? { action: 'edit', id: editDept.id, name } 
        : { action: 'create', name };
        
      const res = await fetch('/api/admin/org-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'department', data: payload })
      });
      if (res.ok) {
        setShowAdd(false);
        setEditDept(null);
        setName('');
        load();
      } else {
        alert('Failed to save department');
      }
    } catch {
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id, employeeCount) => {
    if (employeeCount > 0) {
      alert(`Cannot archive department. There are ${employeeCount} employees currently assigned to it.`);
      return;
    }
    if (!confirm('Are you sure you want to archive this department?')) return;
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'department', data: { action: 'archive', id } })
      });
      if (res.ok) load();
    } catch {
      alert('Failed to archive department');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading departments...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      {showAdd || editDept ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifycontent: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 400 }}>
            <h2 style={{ margin: '0 0 1rem' }}>{editDept ? 'Edit Department' : 'Add Department'}</h2>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Department Name" style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: '1rem', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowAdd(false); setEditDept(null); setName(''); }} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#7B5EA7', color: '#fff', cursor: 'pointer' }}>Save</button>
            </div>
          </form>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>Departments</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Manage the structural units of your organisation.</p>
        </div>
        <button onClick={() => { setShowAdd(true); setName(''); }} style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: 'none', background: '#7B5EA7', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>+ Add Department</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', background: '#faf9f8', borderBottom: '1px solid #f0ece6', fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
          <div>Name</div>
          <div>Employees</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>
        {departments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No departments found.</div>
        ) : (
          departments.map((d, i) => (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < departments.length - 1 ? '1px solid #f0ece6' : 'none', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>{d.name}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{d.employeeCount} assigned</div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => { setEditDept(d); setName(d.name); }} style={{ padding: '0.25rem 0.75rem', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleArchive(d.id, d.employeeCount)} style={{ padding: '0.25rem 0.75rem', borderRadius: 6, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>Archive</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
