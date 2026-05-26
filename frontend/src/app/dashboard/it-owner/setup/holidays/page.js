'use client';

import { useState, useEffect } from 'react';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', date: '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/org-settings')
      .then(res => res.json())
      .then(d => {
        if (d.holidays) setHolidays(d.holidays);
        if (d.holidayYear) setHolidayYear(d.holidayYear);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'holiday', data: { action: 'sync' } })
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.message || 'Failed to sync holidays');
      } else {
        alert(`Holiday sync complete for ${d.year}. Added ${d.created || 0} new holidays.`);
        load();
      }
    } catch {
      alert('Failed to sync holidays');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'holiday', data: { action: 'create', ...form } })
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: '', date: '' });
        load();
      } else {
        alert('Failed to save holiday');
      }
    } catch {
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'holiday', data: { action: 'delete', id } })
      });
      if (res.ok) load();
    } catch {
      alert('Failed to remove holiday');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading holidays...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: 400 }}>
            <h2 style={{ margin: '0 0 1rem' }}>Add Holiday</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>Holiday Name</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diwali" style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 4 }}>Date</label>
              <input required type="date" min={`${holidayYear}-01-01`} max={`${holidayYear}-12-31`} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: 'none', background: '#7B5EA7', color: '#fff', cursor: 'pointer' }}>Save</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>Holiday Calendar</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Define org-wide paid holidays for {holidayYear}. Holiday dates are treated as paid leave in payroll.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSync} disabled={syncing} style={{ padding: '0.625rem 1rem', borderRadius: 9999, border: '1px solid #d1fae5', background: '#ecfdf5', color: '#047857', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>{syncing ? 'Syncing...' : `Sync ${holidayYear} From API`}</button>
          <button onClick={() => setShowAdd(true)} style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: 'none', background: '#7B5EA7', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>+ Add Holiday</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '1rem', padding: '1rem 1.5rem', background: '#faf9f8', borderBottom: '1px solid #f0ece6', fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
          <div>Holiday</div>
          <div>Date</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>
        {holidays.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No holidays added.</div>
        ) : (
          holidays.map((h, i) => (
            <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < holidays.length - 1 ? '1px solid #f0ece6' : 'none', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>{h.name}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => handleDelete(h.id)} style={{ padding: '0.25rem 0.75rem', borderRadius: 6, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
