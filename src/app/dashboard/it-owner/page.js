'use client';

import { useEffect, useState } from 'react';
import { Building2, MapPin, Shield, CheckCircle, Plus, Users, ShieldAlert, Coins } from 'lucide-react';

export default function ITOwnerDashboard() {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState('');
  const [newLoc, setNewLoc] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [setupRes, statsRes] = await Promise.all([
        fetch('/api/setup'),
        fetch('/api/dashboard/stats')
      ]);
      const setupData = setupRes.ok ? await setupRes.json() : null;
      const statsData = statsRes.ok ? await statsRes.json() : null;
      setData(setupData);
      setStats(statsData?.stats || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddDept(e) {
    e.preventDefault();
    if (!newDept) return;
    await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDept })
    });
    setNewDept('');
    load();
  }

  async function handleAddLoc(e) {
    e.preventDefault();
    if (!newLoc) return;
    await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLoc })
    });
    setNewLoc('');
    load();
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading IT Dashboard...</div>;
  if (!data) return <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>Failed to load organization settings.</div>;

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a' }}>IT Management Console</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Overview of organization settings and administrative controls.</p>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Active Headcount', value: stats?.headcount ?? 0, icon: Users, color: '#7B5EA7', bg: 'rgba(123,94,167,0.1)' },
          { label: 'System Health', value: stats?.systemHealth ?? 'Healthy', icon: Shield, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Pending Payroll', value: `₹${(stats?.pendingPayroll ?? 0).toLocaleString('en-IN')}`, icon: Coins, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Setup Status', value: stats?.setupComplete ? 'Complete' : 'Pending', icon: CheckCircle, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' }
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: kpi.bg, display: 'flex', alignItems: 'center', justifyCentering: 'center', flexShrink: 0, justifyContent: 'center' }}>
                <Icon size={20} color={kpi.color} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{kpi.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginTop: '0.125rem' }}>{kpi.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Left Side: Company Settings & Admins */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Org details card */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} color="#7B5EA7" /> Company Profile
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Company Name</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1a1a1a', marginTop: '0.25rem' }}>{data.companyName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Industry</div>
                <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1a1a1a', marginTop: '0.25rem' }}>{data.industry}</div>
              </div>
            </div>
          </div>

          {/* Admins & HR */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={20} color="#7B5EA7" /> Administrative Accounts
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.admins?.map(adm => (
                <div key={adm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: '#fafaf9', borderRadius: '10px', border: '1px solid #f0ece6' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{adm.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{adm.email}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', background: '#f3e8ff', color: '#7c3aed', borderRadius: '6px' }}>{adm.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Departments & Locations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Departments list */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="#7B5EA7" /> Departments ({data.departments?.length || 0})
            </h2>
            <form onSubmit={handleAddDept} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="New department..."
                style={{ flex: 1, padding: '0.4rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8125rem' }} />
              <button type="submit" style={{ padding: '0.4rem 0.75rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Plus size={16} /></button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {data.departments?.map(dept => (
                <div key={dept.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f9f8f7', borderRadius: 8, fontSize: '0.8125rem' }}>
                  <span>{dept.name}</span>
                  <span style={{ color: '#9ca3af' }}>{dept._count?.users || 0} users</span>
                </div>
              ))}
            </div>
          </div>

          {/* Locations list */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} color="#7B5EA7" /> Locations ({data.locations?.length || 0})
            </h2>
            <form onSubmit={handleAddLoc} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input value={newLoc} onChange={e => setNewLoc(e.target.value)} placeholder="New location..."
                style={{ flex: 1, padding: '0.4rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.8125rem' }} />
              <button type="submit" style={{ padding: '0.4rem 0.75rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Plus size={16} /></button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {data.locations?.map(loc => (
                <div key={loc.id} style={{ padding: '0.5rem 0.75rem', background: '#f9f8f7', borderRadius: 8, fontSize: '0.8125rem' }}>
                  {loc.name}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
