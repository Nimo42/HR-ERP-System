'use client';

import { useState, useEffect } from 'react';

export default function WorkingHoursPage() {
  const [data, setData] = useState({
    shiftStart: '09:00',
    shiftEnd: '18:00',
    minHoursPresent: '4',
    overtimeThreshold: '9'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetch('/api/admin/org-settings')
      .then(res => res.json())
      .then(d => {
        if (d.workingHours) setData(d.workingHours);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'workingHours', data })
      });
      if (res.ok) {
        setMsg({ text: 'Working hours updated successfully.', type: 'success' });
      } else {
        setMsg({ text: 'Failed to update working hours.', type: 'error' });
      }
    } catch {
      setMsg({ text: 'An error occurred.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading working hours...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Working Hours</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Configure default shift timings and attendance rules.</p>
      </div>

      {msg.text && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#059669' : '#dc2626' }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 1rem' }}>Default Shift Timings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shift Start</label>
              <input type="time" required value={data.shiftStart} onChange={e => setData({ ...data, shiftStart: e.target.value })} 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shift End</label>
              <input type="time" required value={data.shiftEnd} onChange={e => setData({ ...data, shiftEnd: e.target.value })} 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f0ece6', paddingTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 1rem' }}>Attendance Rules</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min Hours for Half Day</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" required min="1" max="8" value={data.minHoursPresent} onChange={e => setData({ ...data, minHoursPresent: e.target.value })} 
                  style={{ width: '5rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>hours</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '6px 0 0' }}>If clocked hours &lt; this value, marked absent.</p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overtime Threshold</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="number" required min="8" max="16" value={data.overtimeThreshold} onChange={e => setData({ ...data, overtimeThreshold: e.target.value })} 
                  style={{ width: '5rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>hours</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '6px 0 0' }}>Hours beyond this are flagged as overtime.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #f0ece6' }}>
          <button type="submit" disabled={saving} style={{ padding: '0.625rem 1.5rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
