'use client';

import { useEffect, useState } from 'react';
import { Users, Clock, AlertTriangle, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function HRDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, leaveRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/leaves?status=Pending'),
        ]);
        const statsData = statsRes.ok ? await statsRes.json() : { stats: {} };
        const leaveData = leaveRes.ok ? await leaveRes.json() : { requests: [] };

        setStats(statsData.stats || {});
        setPendingLeaves(leaveData.requests || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards = [
    { label: 'Pending Approvals', value: stats?.pendingLeaves ?? '—', icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'On Leave Today', value: stats?.onLeaveToday ?? '—', icon: Users, color: '#7B5EA7', bg: 'rgba(123,94,167,0.1)' },
    { label: 'Late Arrivals Today', value: stats?.lateArrivals ?? '—', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Overtime Cases (Month)', value: stats?.overtimeCount ?? '—', icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  ];

  async function handleApprove(id, status) {
    await fetch(`/api/leaves/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setPendingLeaves(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a' }}>HR Control Room</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Today's operational metrics, attendance anomalies, and action items.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{
              background: '#fff',
              border: '1px solid #f0ece6',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <div style={{ width: 52, height: 52, borderRadius: '12px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={24} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.1 }}>
                  {loading ? '—' : card.value}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending Leave Requests Table */}
      <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="#f59e0b" /> Pending Leave Approvals
          </h2>
          <a href="/dashboard/leave" style={{ fontSize: '0.8125rem', color: '#7B5EA7', fontWeight: 500 }}>View all →</a>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Loading...</div>
        ) : pendingLeaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
            <p>No pending leave requests 🎉</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0ece6' }}>
                {['Employee', 'Type', 'From', 'To', 'Reason', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.625rem 0.75rem', textAlign: 'left', color: '#9ca3af', fontWeight: 500, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingLeaves.slice(0, 5).map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #fafaf9' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{req.user?.name}</td>
                  <td style={{ padding: '0.75rem', color: '#6b7280' }}>{req.leaveType?.name}</td>
                  <td style={{ padding: '0.75rem', color: '#6b7280' }}>{new Date(req.startDate).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '0.75rem', color: '#6b7280' }}>{new Date(req.endDate).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '0.75rem', color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApprove(req.id, 'Approved')} style={{ padding: '0.25rem 0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>Approve</button>
                      <button onClick={() => handleApprove(req.id, 'Rejected')} style={{ padding: '0.25rem 0.75rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
