'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Building2, ShieldCheck, CheckCircle2, 
  CalendarDays, DollarSign, User, Bell, Clock,
  FileText, Settings, Search, Banknote, List, Check
} from 'lucide-react';

const INR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 172800) return 'yesterday';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const entityTypeIcon = { 
  leave: <CalendarDays size={16} color="#7B5EA7" />, 
  payroll: <Banknote size={16} color="#059669" />, 
  account: <User size={16} color="#0891b2" />, 
  notification: <Bell size={16} color="#d97706" /> 
};

export default function AdminDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [payroll, setPayroll] = useState(null);
  const [logs, setLogs] = useState([]);
  const [hrAttendance, setHrAttendance] = useState([]);
  const [hrPunchingId, setHrPunchingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, statsRes, payrollRes, logsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/dashboard/stats'),
        fetch('/api/admin/payroll-gate'),
        fetch('/api/admin/audit-logs?limit=5'),
      ]);
      if (meRes.ok) setMe((await meRes.json()).user);
      if (statsRes.ok) setStats((await statsRes.json()).stats);
      if (payrollRes.ok) {
        const pd = await payrollRes.json();
        setPayroll(pd);
      }
      if (logsRes.ok) setLogs((await logsRes.json()).logs || []);

      // HR daily attendance snapshot for Admin
      const empRes = await fetch('/api/employees');
      if (empRes.ok) {
        const empData = await empRes.json();
        const hrUsers = (empData.employees || []).filter(u => u.role === 'HR Manager');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendanceRows = await Promise.all(hrUsers.map(async (u) => {
          try {
            const r = await fetch(`/api/attendance?userId=${u.id}`);
            const d = await r.json();
            const userLogs = d.logs || [];
            const active = userLogs.find(l => l.clockOutTime === null);
            const todayLog = userLogs.find(l => {
              const cd = new Date(l.clockInTime);
              cd.setHours(0, 0, 0, 0);
              return cd.getTime() === today.getTime();
            });
            return {
              id: u.id,
              name: u.name,
              status: active ? 'Clocked In' : (todayLog ? 'Clocked Out' : 'Not Clocked In'),
              clockInTime: todayLog?.clockInTime || null,
              clockOutTime: todayLog?.clockOutTime || null
            };
          } catch {
            return { id: u.id, name: u.name, status: 'Unavailable', clockInTime: null, clockOutTime: null };
          }
        }));
        setHrAttendance(attendanceRows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFinalize = async () => {
    if (!payroll?.pending?.id) return;
    setFinalizing(true);
    try {
      const res = await fetch('/api/admin/payroll-gate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payroll.pending.id, action: 'finalize' })
      });
      const data = await res.json();
      if (res.ok) { setShowConfirm(false); await load(); }
      else alert(data.message || 'Failed to finalize');
    } catch (e) { alert('Error finalizing payroll'); }
    finally { setFinalizing(false); }
  };

  const handleReject = async () => {
    if (!payroll?.pending?.id) return;
    const res = await fetch('/api/admin/payroll-gate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payroll.pending.id, action: 'reject', reason: rejectReason })
    });
    if (res.ok) { setRejectModal(false); setRejectReason(''); await load(); }
    else alert('Failed to reject draft');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #EBE6F9', borderTop: '3px solid #7B5EA7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading dashboard…</p>
    </div>
  );

  const pending = payroll?.pending;
  const identityLabel = me?.role === 'Admin'
    ? 'Admin'
    : (me?.employeeId || 'User');

  
  async function toggleHrPunch(userId) {
    try {
      setHrPunchingId(userId);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, workLocation: 'Office' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to punch');
      await load();
    } catch (e) {
      alert(e.message || 'Failed to update HR attendance');
    } finally {
      setHrPunchingId('');
    }
  }
  const statCards = [
    { label: 'Active Employees', value: stats?.headcount ?? '—', icon: <Users size={20} color="#7B5EA7" />, color: '#7B5EA7', bg: '#EBE6F9' },
    { label: 'Departments', value: stats?.deptCount ?? '—', icon: <Building2 size={20} color="#0891b2" />, color: '#0891b2', bg: '#e0f2fe' },
    { label: 'HR Managers', value: stats?.hrManagerCount ?? '-', icon: <ShieldCheck size={20} color="#059669" />, color: '#059669', bg: '#d1fae5' },
    { label: 'System Health', value: stats?.systemHealth ?? 'Healthy', icon: <CheckCircle2 size={20} color="#059669" />, color: '#059669', bg: '#d1fae5', isText: true },
  ];

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1f2937', maxWidth: 1100 }}>

      {/* Finalize Confirm Modal */}
      {showConfirm && pending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 480, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ marginBottom: '0.5rem', color: '#059669' }}><Banknote size={32} /></div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Confirm Finalise & Disburse</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              You are about to finalise <strong>{pending.monthLabel} {pending.year} payroll</strong>.<br />
              Total net disbursement: <strong style={{ color: '#059669', fontSize: '1rem' }}>{INR(pending.totalNet)}</strong><br />
              Covering <strong>{pending.employeeCount}</strong> employees.<br /><br />
              This will lock the payroll, generate payslips, and notify all employees via email. <strong>This action cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleFinalize} disabled={finalizing} style={{ padding: '0.625rem 1.5rem', borderRadius: 9999, border: 'none', background: '#111827', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: finalizing ? 0.7 : 1 }}>
                {finalizing ? 'Processing…' : 'Confirm Finalise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && pending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 440, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem' }}>Reject Payroll Draft</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1rem' }}>This will delete the draft and send it back for HR to recalculate.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)" rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setRejectModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: 9999, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReject} style={{ padding: '0.5rem 1.25rem', borderRadius: 9999, border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Reject Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {greeting()}, {identityLabel}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Admin Console
        </p>
      </div>

      {/* Payroll Action Gate — only shown when pending */}
      {pending && (
        <div style={{
          background: 'linear-gradient(135deg, #1f1035 0%, #2d1b4e 100%)',
          borderRadius: 18, padding: '1.75rem 2rem', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(123,94,167,0.25)',
          border: '1px solid rgba(123,94,167,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(123,94,167,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Banknote size={24} color="#EBE6F9" />
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Payroll awaiting sign-off</div>
              <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                {pending.monthLabel} {pending.year} — <span style={{ color: '#a78bfa' }}>{INR(pending.totalNet)} net</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', marginTop: 2 }}>
                {pending.employeeCount} employees · Initiated by {pending.createdBy}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
            <button onClick={() => router.push('/dashboard/it-owner/payroll-gate')}
              style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              View Draft →
            </button>
            <button onClick={() => setRejectModal(true)}
              style={{ padding: '0.625rem 1.25rem', borderRadius: 9999, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
              Reject
            </button>
            <button onClick={() => setShowConfirm(true)}
              style={{ padding: '0.625rem 1.5rem', borderRadius: 9999, border: 'none', background: '#7B5EA7', color: '#fff', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(123,94,167,0.4)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#6d4fa0'}
              onMouseLeave={e => e.currentTarget.style.background = '#7B5EA7'}>
              Finalise & Disburse <Check size={16} style={{ marginLeft: 4, display: 'inline' }} />
            </button>
          </div>
        </div>
      )}

      {/* Stat Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', border: '1px solid #f0ece6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{card.label}</div>
              <div style={{ fontSize: card.isText ? '0.875rem' : '1.625rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* System Health + Recent Audit Log */}
      {/* Recent Audit Log */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '1.5rem', border: '1px solid #f0ece6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="#7B5EA7" /> HR Attendance Today
            </h2>
          </div>
          {hrAttendance.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1.25rem 0', fontSize: '0.875rem' }}>No HR records found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {hrAttendance.map((r) => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.75rem', padding: '0.75rem', border: '1px solid #f3f4f6', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{r.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>{r.status}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Log */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '1.5rem', border: '1px solid #f0ece6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List size={16} color="#7B5EA7" /> Recent Activity
            </h2>
            <button onClick={() => router.push('/dashboard/it-owner/audit')} style={{ fontSize: '0.8125rem', color: '#7B5EA7', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
          </div>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0', fontSize: '0.875rem' }}>No activity yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < logs.length - 1 ? '1px solid #f9f8f7' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f4f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {entityTypeIcon[log.entityType] || <FileText size={16} color="#9ca3af" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                      {log.actor} · {log.entity}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#c4b5c7', fontWeight: 500, flexShrink: 0, paddingTop: 3 }}>{timeAgo(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ background: '#fff', borderRadius: 18, padding: '1.5rem', border: '1px solid #f0ece6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 1.25rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          {[
            { label: 'Add HR Manager', desc: 'Create a new HR account', icon: <User size={24} color="#7B5EA7" />, path: '/dashboard/it-owner/access' },
            { label: 'Payroll Gate', desc: 'Review & sign off payroll', icon: <Banknote size={24} color="#059669" />, path: '/dashboard/it-owner/payroll-gate' },
            { label: 'Audit Log', desc: 'Review system activity', icon: <Search size={24} color="#d97706" />, path: '/dashboard/it-owner/audit' },
            { label: 'Org Setup', desc: 'Configure company settings', icon: <Settings size={24} color="#0891b2" />, path: '/dashboard/it-owner/setup' },
          ].map((a, i) => (
            <button key={i} onClick={() => router.push(a.path)} style={{ padding: '1rem', borderRadius: 14, border: '1px solid #f0ece6', background: '#faf9f8', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EBE6F9'; e.currentTarget.style.borderColor = '#d4c8f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#faf9f8'; e.currentTarget.style.borderColor = '#f0ece6'; }}>
              <div style={{ marginBottom: '0.25rem' }}>{a.icon}</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827' }}>{a.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


