'use client';

import { useState, useEffect } from 'react';

export default function CompanyProfilePage() {
  const [data, setData] = useState({
    companyName: '',
    displayName: '',
    address: '',
    primaryEmail: '',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetch('/api/admin/org-settings')
      .then(res => res.json())
      .then(d => {
        if (d.profile) setData(d.profile);
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
        body: JSON.stringify({ section: 'profile', data })
      });
      if (res.ok) {
        setMsg({ text: 'Profile updated successfully.', type: 'success' });
      } else {
        setMsg({ text: 'Failed to update profile.', type: 'error' });
      }
    } catch {
      setMsg({ text: 'An error occurred.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 3000);
    }
  };

  const handleTimezoneChange = (e) => {
    if (confirm('Changing the timezone will affect all historical timestamps and scheduled jobs. Are you sure?')) {
      setData({ ...data, timezone: e.target.value });
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Company Profile</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Manage the core identity of the organisation.</p>
      </div>

      {msg.text && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#059669' : '#dc2626' }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legal Company Name</label>
            <input required value={data.companyName} onChange={e => setData({ ...data, companyName: e.target.value })} 
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Display Name</label>
            <input required value={data.displayName} onChange={e => setData({ ...data, displayName: e.target.value })} 
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Contact Email</label>
          <input required type="email" value={data.primaryEmail} onChange={e => setData({ ...data, primaryEmail: e.target.value })} 
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Address</label>
          <textarea required value={data.address} onChange={e => setData({ ...data, address: e.target.value })} rows={3}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', outline: 'none', resize: 'vertical' }} />
        </div>

        <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: 8, border: '1px solid #fde68a' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Zone</label>
          <p style={{ fontSize: '0.8125rem', color: '#92400e', margin: '0 0 0.75rem' }}>Critical: Affects attendance clock-in logic, leave calculations, and scheduled jobs.</p>
          <select value={data.timezone} onChange={handleTimezoneChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.875rem', outline: 'none', background: '#fff' }}>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="UTC">UTC</option>
          </select>
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
