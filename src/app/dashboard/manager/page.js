'use client';

import { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);
  const [team, setTeam] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/leaves?status=Pending').then(r => r.json()),
    ]).then(([st, emp, lv]) => {
      setStats(st.stats || null);
      setTeam(emp.employees || []);
      setPending(lv.requests || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function act(id, status) {
    await fetch(`/api/leaves/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setPending(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Team Dashboard</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Overview of reports present today, leave approvals, and metrics.</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{loading ? '—' : stats?.teamPresent ?? 0}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Present Today</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} color="#dc2626" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{loading ? '—' : stats?.teamAbsent ?? 0}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Absent Today</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{loading ? '—' : stats?.teamOnLeave ?? 0}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>On Leave Today</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(123,94,167,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} color="#7B5EA7" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{loading ? '—' : stats?.totalReports ?? 0}</div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>Total Reports</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Team List */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>My Reports</h2>
            <Link href="/dashboard/directory" style={{ fontSize: '0.8125rem', color: '#7B5EA7', fontWeight: 500 }}>View directory →</Link>
          </div>
          {loading ? <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</p> : team.slice(0, 5).map(emp => (
            <Link key={emp.id} href={`/dashboard/directory/${emp.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid #fafaf9', textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7B5EA7,#a78bde)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0 }}>
                {emp.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>{emp.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{emp.department?.name || emp.role}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pending Leaves */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>Pending Leave Approvals ({pending.length})</h2>
          </div>
          {loading ? <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</p>
            : pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <CheckCircle2 size={28} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.875rem' }}>All leave approvals completed 🎉</p>
              </div>
            ) : pending.map(req => {
              const days = Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1;
              return (
                <div key={req.id} style={{ padding: '0.875rem 0', borderBottom: '1px solid #fafaf9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{req.user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{req.leaveType?.name} · {days}d</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => act(req.id, 'Approved')} style={{ padding: '0.25rem 0.625rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>✓</button>
                      <button onClick={() => act(req.id, 'Rejected')} style={{ padding: '0.25rem 0.625rem', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>✗</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {new Date(req.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {new Date(req.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
