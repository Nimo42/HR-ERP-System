'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, FileText, User, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null);
  const [balances, setBalances] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/leaves?type=balances').then(r => r.json()),
      fetch('/api/leaves').then(r => r.json()),
    ]).then(([st, bal, lv]) => {
      setStats(st.stats || null);
      setBalances(bal.balances || []);
      setRecentLeaves((lv.requests || []).slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const STATUS_STYLES = {
    Pending:  { bg: '#fef9c3', text: '#854d0e' },
    Approved: { bg: '#d1fae5', text: '#065f46' },
    Rejected: { bg: '#fee2e2', text: '#991b1b' },
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>My Dashboard</h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Welcome back. Here is your dashboard summary.</p>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'My Profile', icon: User, href: '/dashboard/directory', color: '#7B5EA7', bg: 'rgba(123,94,167,0.1)' },
          { label: 'Clock In/Out', icon: Clock, href: '/dashboard/attendance', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Apply for Leave', icon: CalendarDays, href: '/dashboard/leave', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} style={{
              background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={item.color} />
              </div>
              <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.9375rem' }}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Attendance & Payslip summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Attendance stats summary */}
        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="#7B5EA7" /> My Attendance This Month
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ background: '#fafaf9', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>PUNCH DAYS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7B5EA7', marginTop: '0.25rem' }}>{loading ? '—' : stats?.presentDays ?? 0}</div>
            </div>
            <div style={{ background: '#fafaf9', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>LATE COUNT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats?.lateCount > 0 ? '#ef4444' : '#111827', marginTop: '0.25rem' }}>{loading ? '—' : stats?.lateCount ?? 0}</div>
            </div>
            <div style={{ background: '#fafaf9', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>TOTAL HOURS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{loading ? '—' : stats?.totalHours ?? 0}h</div>
            </div>
          </div>
        </div>

        {/* Payslip date widget */}
        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7B5EA7', marginBottom: '0.5rem' }}>
            <FileText size={18} />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Next Payslip Release</span>
          </div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#111827' }}>
            {loading ? 'Loading...' : stats?.nextPayslipDate || '—'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Auto-disbursed to bank account</span>
        </div>
      </div>

      {/* Leave Balances */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarDays size={18} color="#7B5EA7" /> Leave Balances
        </h2>
        {loading ? <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</p>
          : balances.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No leave balances configured yet.</p>
          : (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {balances.map(b => (
                <div key={b.id} style={{ background: '#fafaf9', borderRadius: 10, padding: '1rem 1.25rem', minWidth: 120, border: '1px solid #f0ece6' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.375rem' }}>{b.leaveType?.name}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: b.balance <= 1 ? '#dc2626' : '#7B5EA7', lineHeight: 1 }}>{b.balance}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>days left</div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Recent Leave Requests */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="#7B5EA7" /> Recent Leave Requests
          </h2>
          <Link href="/dashboard/leave" style={{ fontSize: '0.8125rem', color: '#7B5EA7', fontWeight: 500 }}>View all →</Link>
        </div>
        {loading ? <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</p>
          : recentLeaves.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No leave requests yet.</p>
          : recentLeaves.map(req => {
            const ss = STATUS_STYLES[req.status] || STATUS_STYLES.Pending;
            const days = Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1;
            return (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #fafaf9' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{req.leaveType?.name} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· {days}d</span></div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.125rem' }}>
                    {new Date(req.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {new Date(req.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ padding: '0.2rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: ss.bg, color: ss.text }}>{req.status}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
