'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays, Clock, FileText, CheckCircle2,
  ChevronRight, Megaphone, ShieldAlert,
  AlertCircle, AlertTriangle, Briefcase, Info, Download
} from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDashboard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null); // 'Not clocked in yet', 'Clocked in at ...', 'On leave', 'Holiday'
  const [upcomingLeaves, setUpcomingLeaves] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [
        meRes, statsRes, attendanceRes, leavesRes,
        announcementsRes, policiesRes, payrollRes
      ] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/dashboard/stats'),
        fetch('/api/attendance'),
        fetch('/api/leaves'),
        fetch('/api/announcements'),
        fetch('/api/compliance/policies'),
        fetch('/api/payroll')
      ]);

      const meData = await meRes.json();
      setMe(meData.user);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats || {});
      }

      if (announcementsRes.ok) {
        const d = await announcementsRes.json();
        setAnnouncements((d.announcements || []).slice(0, 5));
      }

      // Check attendance logs for today
      let onLeaveToday = false;
      const today = new Date(); today.setHours(0,0,0,0);
      const next30 = new Date(today); next30.setDate(next30.getDate() + 30);

      if (leavesRes.ok) {
        const d = await leavesRes.json();
        const allLeaves = d.requests || [];
        
        // Find if on leave today
        const approvedLeaves = allLeaves.filter(r => r.status === 'Approved');
        onLeaveToday = approvedLeaves.some(r => {
          const s = new Date(r.startDate); s.setHours(0,0,0,0);
          const e = new Date(r.endDate); e.setHours(23,59,59,999);
          return today >= s && today <= e;
        });

        // Upcoming 30 days
        const upcoming = allLeaves.filter(r => {
          const s = new Date(r.startDate); s.setHours(0,0,0,0);
          return s >= today && s <= next30;
        }).sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
        setUpcomingLeaves(upcoming);
      }

      if (attendanceRes.ok) {
        const d = await attendanceRes.json();
        const logs = d.logs || [];
        const todayLog = logs.find(l => {
          const lDate = new Date(l.clockInTime); lDate.setHours(0,0,0,0);
          return lDate.getTime() === today.getTime();
        });

        if (onLeaveToday) {
          setTodayAttendance({ status: 'On leave today', color: '#7B5EA7', bg: '#f3e8ff' });
        } else if (todayLog) {
          const time = new Date(todayLog.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          setTodayAttendance({ status: `Clocked in at ${time}`, color: '#059669', bg: '#f0fdf4' });
        } else {
          // Could check if it's a holiday, but defaulting to Not clocked in
          setTodayAttendance({ status: 'Not clocked in yet', color: '#d97706', bg: '#fef3c7' });
        }
      }

      // Pending Tasks (policies)
      const tasks = [];
      if (policiesRes.ok) {
        const d = await policiesRes.json();
        const unacked = (d.policies || []).filter(p => p.readReceiptRequired && !p.acknowledged);
        unacked.forEach(p => {
          tasks.push({ id: p.id, title: `Acknowledge: ${p.title}`, link: '/dashboard/directory/me' });
        });
      }
      setPendingTasks(tasks);

      // Payslips
      if (payrollRes.ok) {
        const d = await payrollRes.json();
        const slips = d.payslips || [];
        if (slips.length > 0) {
          setLatestPayslip(slips[0]);
        }
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCancelLeave(id) {
    if (!confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      await fetch(`/api/leaves/${id}`, { method: 'DELETE' });
      setUpcomingLeaves(p => p.filter(r => r.id !== id));
    } catch (e) {
      console.error('Cancel leave error', e);
    }
  }

  function handleDownloadPayslip(slip) {
    const a = document.createElement('a');
    a.href = `/api/payroll/payslip/${slip.id}/pdf`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>Loading Dashboard...</div>;
  }

  const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1f2937', maxWidth: '1100px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
          Hi, {me?.employeeId || 'Employee'}
        </h1>
        <div style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', fontWeight: 500 }}>
          {currentDate}
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BAND 1 — LEAVE BALANCE STRIP          */}
      {/* ═══════════════════════════════════════ */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Leave Balances
          </div>
          <Link href="/dashboard/leave" style={{
            background: '#7B5EA7', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', 
            borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem'
          }}>
            <CalendarDays size={16} /> Apply for Leave
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {stats?.leaveBalances?.sort((a,b) => (a.isEmergency === b.isEmergency) ? 0 : a.isEmergency ? 1 : -1).map(b => {
            const used = b.quota - b.balance;
            const pct = b.quota > 0 ? (used / b.quota) * 100 : 0;
            const isZero = b.balance <= 0;
            const isEmergency = b.isEmergency;

            let barColor = '#10b981'; // Green
            if (pct >= 90) barColor = '#dc2626'; // Red
            else if (pct >= 75) barColor = '#f59e0b'; // Amber

            return (
              <div key={b.id} style={{
                flex: '0 0 200px',
                background: isEmergency ? '#fef2f2' : (isZero ? '#fafaf9' : '#fff'),
                border: `1px solid ${isEmergency ? '#fecaca' : '#e5e7eb'}`,
                borderRadius: 16,
                padding: '1.25rem',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: isEmergency ? '#dc2626' : '#4b5563', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {isEmergency && <AlertCircle size={14} />}
                  {isEmergency ? 'Emergency pool' : b.name}
                </div>
                
                {isZero ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#9ca3af', lineHeight: 1 }}>0</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem', fontWeight: 500 }}>No balance remaining</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                      {b.balance}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', marginBottom: '1rem', fontWeight: 500 }}>
                      {used} days used
                    </div>
                    <div style={{ width: '100%', height: 6, background: isEmergency ? '#fca5a5' : '#f3f4f6', borderRadius: 999, overflow: 'hidden', marginTop: 'auto' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 999 }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BAND 2 — MY TODAY                       */}
      {/* ═══════════════════════════════════════ */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
          My Today
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {/* Attendance Status */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Clock size={18} color="#6b7280" />
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: '#374151' }}>Attendance Status</h2>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.75rem', borderRadius: 8, background: todayAttendance?.bg, color: todayAttendance?.color, fontWeight: 600, fontSize: '0.875rem' }}>
              {todayAttendance?.status || 'Loading...'}
            </div>
          </div>

          {/* Payslip Status */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Briefcase size={18} color="#6b7280" />
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: '#374151' }}>Next Payslip</h2>
            </div>
            {latestPayslip ? (
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', marginBottom: '0.5rem' }}>
                  Your latest payslip is ready.
                </div>
                <button onClick={() => handleDownloadPayslip(latestPayslip)} style={{ background: '#f3f4f6', border: 'none', padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                  <Download size={14} /> Download PDF
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                Your next payslip will be available on {stats?.nextPayslipDate || '...'}
              </div>
            )}
          </div>

          {/* Pending Tasks */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <ShieldAlert size={18} color="#6b7280" />
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: '#374151' }}>Pending Tasks</h2>
            </div>
            {pendingTasks.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#059669', fontSize: '0.875rem', fontWeight: 500 }}>
                <CheckCircle2 size={16} /> All caught up
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingTasks.map(t => (
                  <Link key={t.id} href={t.link} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', background: '#fef2f2', border: '1px solid #fecaca', padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BAND 3 — UPCOMING & FEED                */}
      {/* ═══════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* My Upcoming */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
            My Upcoming Leaves (30 Days)
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.25rem' }}>
            {upcomingLeaves.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                No upcoming leaves scheduled.
              </div>
            ) : (
              upcomingLeaves.map((r, i) => {
                const days = Math.max(1, Math.ceil((new Date(r.endDate) - new Date(r.startDate)) / 86400000) + 1);
                const isPending = r.status === 'Pending';
                return (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < upcomingLeaves.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.125rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{r.leaveType?.name}</span>
                        {isPending && <span style={{ background: '#fef3c7', color: '#d97706', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: 4 }}>PENDING</span>}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                        {new Date(r.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(r.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {days} day{days > 1 ? 's' : ''}
                      </div>
                    </div>
                    {isPending && (
                      <button onClick={() => handleCancelLeave(r.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Company Feed */}
        <div>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
            Company Announcements
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.25rem' }}>
            {announcements.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                No recent announcements.
              </div>
            ) : (
              <>
                {announcements.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < announcements.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7B5EA7', marginTop: '0.375rem', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', marginBottom: '0.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.content}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


