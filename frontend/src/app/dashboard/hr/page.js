'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Clock, AlertTriangle, CheckCircle2, XCircle, ChevronRight,
  ChevronDown, ChevronUp, Users, CalendarDays, FileText,
  Megaphone, Activity, Bell, BarChart2, UserCheck, Edit3
} from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 5;
async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function usePagination(items) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil((items?.length || 0) / PAGE_SIZE);
  const paged = (items || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { paged, page, setPage, totalPages };
}

function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        style={{ padding: '0.25rem 0.625rem', borderRadius: 6, border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.75rem', color: '#4b5563' }}>
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => setPage(n)}
          style={{ padding: '0.25rem 0.625rem', borderRadius: 6, border: '1px solid #e5e7eb', background: n === page ? '#7B5EA7' : '#fff', color: n === page ? '#fff' : '#4b5563', cursor: 'pointer', fontSize: '0.75rem', fontWeight: n === page ? 700 : 400 }}>
          {n}
        </button>
      ))}
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        style={{ padding: '0.25rem 0.625rem', borderRadius: 6, border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.75rem', color: '#4b5563' }}>
        ›
      </button>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #f0ece6', borderRadius: '16px',
      padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', ...style
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, badge, href }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon size={18} color="#7B5EA7" />
        {title}
        {badge > 0 && (
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 999, background: '#fee2e2', color: '#dc2626' }}>{badge}</span>
        )}
      </h2>
      {href && <Link href={href} style={{ fontSize: '0.8125rem', color: '#7B5EA7', fontWeight: 600, textDecoration: 'none' }}>View all</Link>}
    </div>
  );
}

export default function HRDashboard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // Action Items
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingCorrections, setPendingCorrections] = useState([]);
  const [pendingProfileEdits, setPendingProfileEdits] = useState([]);

  // Situational Awareness
  const [stats, setStats] = useState(null);
  const [onLeaveToday, setOnLeaveToday] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [probationEnding, setProbationEnding] = useState([]);

  // Informational
  const [announcements, setAnnouncements] = useState([]);
  const [activeSurvey, setActiveSurvey] = useState(null);

  // UI State
  const [rejectModal, setRejectModal] = useState(null); // { id, type }
  const [rejectReason, setRejectReason] = useState('');
  const [correctionModal, setCorrectionModal] = useState(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [collapsibles, setCollapsibles] = useState({ probation: true, docExpiry: true, policyAck: true });

  const toggleCollapsible = (key) => setCollapsibles(p => ({ ...p, [key]: !p[key] }));

  const loadData = useCallback(async () => {
    try {
      const [meRes, statsRes, leaveRes, correctionsRes, profileEditsRes, announcementsRes, surveysRes, empsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/dashboard/stats'),
        fetch('/api/leaves?status=Pending'),
        fetch('/api/attendance/corrections?status=Pending'),
        fetch('/api/profile-edit-requests?status=Pending'),
        fetch('/api/announcements'),
        fetch('/api/surveys'),
        fetch('/api/employees'),
      ]);

      const meData = await safeJson(meRes);
      if (!meRes.ok || !meData?.user) throw new Error('Not logged in');
      setMe(meData.user);

      if (statsRes.ok) {
        const d = await safeJson(statsRes);
        if (!d) throw new Error('Invalid stats response');
        setStats(d.stats || {});
        // Use department rates from stats instead of computing from employees
        if (d.stats?.deptRates) {
          setDepartments(d.stats.deptRates.map(dr => ({
            name: dr.name,
            pct: dr.rate,
            present: '-',
            total: '-'
          })));
        }
      }

      if (leaveRes.ok) {
        const d = await safeJson(leaveRes);
        if (!d) throw new Error('Invalid leave response');
        const all = d.requests || [];
        // Emergency pinned first (backend already sorts, but ensure client-side too)
        const sorted = [...all].sort((a, b) => {
          const ae = a.leaveType?.isEmergency ? 1 : 0;
          const be = b.leaveType?.isEmergency ? 1 : 0;
          return be - ae;
        });
        setPendingLeaves(sorted);
        // Filter for on-leave today: leaves where today falls within start-end
        const today = new Date(); today.setHours(0,0,0,0);
        const onLeave = (d.requests || []).filter(r => {
          const s = new Date(r.startDate); s.setHours(0,0,0,0);
          const e = new Date(r.endDate); e.setHours(23,59,59,999);
          return r.status === 'Approved' && today >= s && today <= e;
        });
        setOnLeaveToday(onLeave);
      }

      if (correctionsRes.ok) {
        const d = await safeJson(correctionsRes);
        if (!d) throw new Error('Invalid correction response');
        setPendingCorrections((d.corrections || []).filter(c => c.status === 'Pending'));
      }

      if (profileEditsRes.ok) {
        const d = await safeJson(profileEditsRes);
        if (!d) throw new Error('Invalid profile edit response');
        setPendingProfileEdits(d.requests || []);
      }

      if (announcementsRes.ok) {
        const d = await safeJson(announcementsRes);
        if (!d) throw new Error('Invalid announcements response');
        setAnnouncements((d.announcements || []).slice(0, 5));
      }

      if (surveysRes.ok) {
        const d = await safeJson(surveysRes);
        if (!d) throw new Error('Invalid surveys response');
        setActiveSurvey((d.surveys || []).find(s => s.active) || null);
      }

      if (empsRes.ok) {
        const d = await safeJson(empsRes);
        if (!d) throw new Error('Invalid employees response');
        const emps = d.employees || [];
        // Probation ending within 30 days
        const in30 = new Date(); in30.setDate(in30.getDate() + 30);
        const now = new Date();
        const probEndingSoon = emps.filter(e => e.probationEnd && new Date(e.probationEnd) >= now && new Date(e.probationEnd) <= in30)
          .sort((a, b) => new Date(a.probationEnd) - new Date(b.probationEnd));
        setProbationEnding(probEndingSoon);

        // Department counts fallback if stats deptRates not yet populated
        if (!departments.length) {
          const deptMap = {};
          emps.forEach(e => {
            const dname = e.department?.name || 'Unassigned';
            if (!deptMap[dname]) deptMap[dname] = { total: 0 };
            deptMap[dname].total++;
          });
          setDepartments(Object.entries(deptMap).map(([name, dt]) => ({ name, pct: 0, present: 0, total: dt.total })));
        }
      }
    } catch (e) {
      console.error('HR Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLeaveAction(id, status, reason) {
    try {
      await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(reason ? { note: reason } : {}) })
      });
      setPendingLeaves(p => p.filter(r => r.id !== id));
      setRejectModal(null);
      setRejectReason('');
    } catch (e) { console.error(e); }
  }

  async function handleCorrectionAction(id, status, note) {
    try {
      await fetch('/api/attendance/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, note })
      });
      setPendingCorrections(p => p.filter(c => c.id !== id));
      setCorrectionModal(null);
      setCorrectionNote('');
    } catch (e) { console.error(e); }
  }

  async function handleProfileEditAction(id, status) {
    try {
      await fetch('/api/profile-edit-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      setPendingProfileEdits(p => p.filter(r => r.id !== id));
    } catch (e) { console.error(e); }
  }

  // Pagination hooks
  const leavesPag = usePagination(pendingLeaves);
  const correctionsPag = usePagination(pendingCorrections);
  const profileEditsPag = usePagination(pendingProfileEdits);
  const onLeavePag = usePagination(onLeaveToday);
  const probationPag = usePagination(probationEnding);

  const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const totalActions = pendingLeaves.length + pendingCorrections.length + pendingProfileEdits.length;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';
  const fmtFull = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>Loading HR Dashboard...</div>;
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1f2937', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
          Hi, {me?.employeeId || 'HR'}
        </h1>
        <div style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', fontWeight: 500 }}>
          {currentDate}
          {totalActions > 0 && (
            <span style={{ marginLeft: '0.5rem', padding: '0.125rem 0.625rem', borderRadius: 999, background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem' }}>
              {totalActions} action{totalActions > 1 ? 's' : ''} need your attention
            </span>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BAND 1 — ACTION ITEMS                   */}
      {/* ═══════════════════════════════════════ */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
          Action Items
        </div>

        {/* Reject reason modal */}
        {rejectModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', maxWidth: 440, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Rejection Reason</h2>
              <p style={{ color: '#6b7280', fontSize: '0.8125rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
                This reason will be sent to the employee. Please be clear and professional.
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: 9999, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => {
                  if (!rejectReason.trim()) { alert('Please enter a reason.'); return; }
                  if (rejectModal.type === 'leave') handleLeaveAction(rejectModal.id, 'Rejected', rejectReason);
                  else if (rejectModal.type === 'correction') handleCorrectionAction(rejectModal.id, 'Rejected', rejectReason);
                }}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: 9999, border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pending Leave Requests ── */}
        <Card style={{ marginBottom: '1.25rem' }}>
          <CardHeader icon={Clock} title="Pending Leave Requests" badge={pendingLeaves.length} href="/dashboard/leave" />
          {pendingLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.875rem', margin: 0 }}>No pending leave requests</p>
            </div>
          ) : (
            <>
              {leavesPag.paged.map(req => {
                const isEmergency = req.leaveType?.isEmergency;
                const days = Math.max(1, Math.ceil((new Date(req.endDate) - new Date(req.startDate)) / 86400000) + 1);
                return (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.875rem 0', borderBottom: '1px solid #f9f8f7' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827' }}>{req.user?.name}</span>
                        {isEmergency && <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.125rem 0.375rem', borderRadius: 4 }}>EMERGENCY</span>}
                        {req.user?.department?.name && <span style={{ fontSize: '0.6875rem', color: '#7B5EA7', background: '#f3e8ff', padding: '0.125rem 0.375rem', borderRadius: 4, fontWeight: 600 }}>{req.user.department.name}</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {req.leaveType?.name} · {fmtDate(req.startDate)} – {fmtDate(req.endDate)} · {days} day{days > 1 ? 's' : ''}
                        {req.reason && <span> · "{req.reason.slice(0, 60)}{req.reason.length > 60 ? '…' : ''}"</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                      <button onClick={() => handleLeaveAction(req.id, 'Approved')}
                        style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#059669', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                        Approve
                      </button>
                      <button onClick={() => setRejectModal({ id: req.id, type: 'leave' })}
                        style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
              <Pagination page={leavesPag.page} totalPages={leavesPag.totalPages} setPage={leavesPag.setPage} />
            </>
          )}
        </Card>

        {/* ── Correction Requests (only if pending) ── */}
        {pendingCorrections.length > 0 && (
          <Card style={{ marginBottom: '1.25rem' }}>
            <CardHeader icon={Edit3} title="Pending Correction Requests" badge={pendingCorrections.length} />
            {correctionsPag.paged.map(c => {
              const log = c.attendanceLog;
              return (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.875rem 0', borderBottom: '1px solid #f9f8f7' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827' }}>{c.user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Date: {fmtFull(log?.clockInTime)} ·
                      Recorded: {log?.clockInTime ? new Date(log.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}–{log?.clockOutTime ? new Date(log.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'open'}
                    </div>
                    {c.requestedClockIn && <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.125rem' }}>
                      Requested: {new Date(c.requestedClockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}–{c.requestedClockOut ? new Date(c.requestedClockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'same'}
                    </div>}
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem', fontStyle: 'italic' }}>"{c.reason}"</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                    <button onClick={() => handleCorrectionAction(c.id, 'Approved', '')}
                      style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#059669', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      Accept
                    </button>
                    <button onClick={() => setRejectModal({ id: c.id, type: 'correction' })}
                      style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
            <Pagination page={correctionsPag.page} totalPages={correctionsPag.totalPages} setPage={correctionsPag.setPage} />
          </Card>
        )}

        {/* ── Profile Edit Requests (only if pending) ── */}
        {pendingProfileEdits.length > 0 && (
          <Card style={{ marginBottom: '1.25rem' }}>
            <CardHeader icon={UserCheck} title="Profile Change Requests" badge={pendingProfileEdits.length} />
            {profileEditsPag.paged.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.875rem 0', borderBottom: '1px solid #f9f8f7' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827' }}>{r.user?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Field: <strong style={{ color: '#374151' }}>{r.field}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                    <span style={{ color: '#dc2626' }}>{r.oldValue || '(empty)'}</span>
                    <ChevronRight size={12} style={{ display: 'inline', margin: '0 0.25rem', verticalAlign: 'middle' }} />
                    <span style={{ color: '#059669' }}>{r.newValue}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem', fontStyle: 'italic' }}>"{r.reason}"</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                  <button onClick={() => handleProfileEditAction(r.id, 'Approved')}
                    style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#059669', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Approve
                  </button>
                  <button onClick={() => handleProfileEditAction(r.id, 'Rejected')}
                    style={{ padding: '0.375rem 0.875rem', borderRadius: 9999, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
            <Pagination page={profileEditsPag.page} totalPages={profileEditsPag.totalPages} setPage={profileEditsPag.setPage} />
          </Card>
        )}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BAND 2 — SITUATIONAL AWARENESS          */}
      {/* ═══════════════════════════════════════ */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem', marginTop: '0.5rem' }}>
          Situational Awareness
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Attendance by Department */}
          <Card>
            <CardHeader icon={BarChart2} title="Attendance Today" href="/dashboard/attendance" />
            {departments.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>No department data yet</div>
            ) : departments.map((dept, i) => {
              const pct = dept.pct ?? 0;
              const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#dc2626';
              return (
                <Link key={i} href={`/dashboard/attendance?dept=${encodeURIComponent(dept.name)}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ marginBottom: '0.875rem', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span style={{ color: '#4b5563' }}>{dept.name}</span>
                      <span style={{ color: '#111827' }}>{pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </Card>

          {/* Who's on leave today */}
          <Card>
            <CardHeader icon={CalendarDays} title="On Leave Today" />
            {onLeaveToday.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>No employees on leave today</div>
            ) : (
              <>
                {onLeavePag.paged.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < onLeavePag.paged.length - 1 ? '1px solid #f9f8f7' : 'none' }}>
                    <div>
                      <Link href={`/dashboard/directory/${r.user?.id}`} style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#111827', textDecoration: 'none' }}>
                        {r.user?.name}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.user?.department?.name} · {r.leaveType?.name}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#7B5EA7', fontWeight: 600 }}>Returns {fmtDate(r.endDate)}</div>
                  </div>
                ))}
                <Pagination page={onLeavePag.page} totalPages={onLeavePag.totalPages} setPage={onLeavePag.setPage} />
              </>
            )}
          </Card>
        </div>

        {/* Upcoming 30 Days */}
        <Card style={{ marginBottom: '1.25rem' }}>
          <CardHeader icon={Bell} title="Upcoming in Next 30 Days" />

          {/* Probation Endings */}
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => toggleCollapsible('probation')}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf9f8', border: '1px solid #f0ece6', borderRadius: 8, padding: '0.625rem 0.875rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
              Probation Endings
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#f3e8ff', color: '#7B5EA7', borderRadius: 999, padding: '0.125rem 0.5rem', fontSize: '0.6875rem', fontWeight: 700 }}>{probationEnding.length}</span>
                {collapsibles.probation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {collapsibles.probation && probationEnding.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {probationPag.paged.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.875rem', borderBottom: '1px solid #f9f8f7' }}>
                    <Link href={`/dashboard/directory/${e.id}`} style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#111827', textDecoration: 'none' }}>{e.name}</Link>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706' }}>Ends {fmtDate(e.probationEnd)}</span>
                  </div>
                ))}
                <Pagination page={probationPag.page} totalPages={probationPag.totalPages} setPage={probationPag.setPage} />
              </div>
            )}
            {collapsibles.probation && probationEnding.length === 0 && (
              <div style={{ padding: '0.75rem 0.875rem', fontSize: '0.8125rem', color: '#9ca3af' }}>No probations ending soon</div>
            )}
          </div>

          {/* Doc Expiries placeholder */}
          <div style={{ marginBottom: '0' }}>
            <button onClick={() => toggleCollapsible('docExpiry')}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf9f8', border: '1px solid #f0ece6', borderRadius: 8, padding: '0.625rem 0.875rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
              Document Expiries
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 999, padding: '0.125rem 0.5rem', fontSize: '0.6875rem', fontWeight: 700 }}>0</span>
                {collapsibles.docExpiry ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {collapsibles.docExpiry && (
              <div style={{ padding: '0.75rem 0.875rem', fontSize: '0.8125rem', color: '#9ca3af' }}>No documents expiring soon</div>
            )}
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* BAND 3 — INFORMATIONAL SUMMARIES        */}
      {/* ═══════════════════════════════════════ */}
      <div>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem', marginTop: '0.5rem' }}>
          Organisation Summary
        </div>

        {/* Stat Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'ACTIVE EMPLOYEES', value: stats?.activeEmployees ?? '—', color: '#7B5EA7', bg: '#f3e8ff' },
            { label: 'ON LEAVE TODAY', value: `${stats?.onLeaveToday ?? onLeaveToday.length}`, color: '#f59e0b', bg: '#fef3c7' },
            { label: 'OPEN POSITIONS', value: stats?.openPositions ?? '—', color: '#3b82f6', bg: '#dbeafe' },
            { label: 'NEXT PAYROLL', value: stats?.daysToPayroll ?? '—', color: '#10b981', bg: '#d1fae5', suffix: 'days' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {s.value}{s.suffix ? <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginLeft: '0.25rem' }}>{s.suffix}</span> : ''}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Recent Announcements */}
          <Card>
            <CardHeader icon={Megaphone} title="Recent Announcements" href="/dashboard/announcements" />
            {announcements.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.8125rem', textAlign: 'center', padding: '1.5rem 0' }}>No announcements yet</div>
            ) : announcements.map((a, i) => (
              <div key={a.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < announcements.length - 1 ? '1px solid #f9f8f7' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{fmtFull(a.createdAt)}</div>
                </div>
                {a.readRate !== undefined && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7B5EA7', background: '#f3e8ff', borderRadius: 9999, padding: '0.125rem 0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {a.readRate}% read
                  </span>
                )}
              </div>
            ))}
          </Card>

          {/* Active Pulse Survey */}
          {activeSurvey ? (
            <Card>
              <CardHeader icon={Activity} title="Active Pulse Survey" href="/dashboard/announcements" />
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', marginBottom: '0.5rem' }}>{activeSurvey.question}</div>
              <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
                {activeSurvey.totalResponses ?? 0} response{(activeSurvey.totalResponses ?? 0) !== 1 ? 's' : ''} received
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, ((activeSurvey.totalResponses || 0) / Math.max(1, stats?.activeEmployees || 1)) * 100)}%`, height: '100%', background: '#7B5EA7', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.375rem' }}>
                {Math.round(((activeSurvey.totalResponses || 0) / Math.max(1, stats?.activeEmployees || 1)) * 100)}% response rate
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader icon={Activity} title="Pulse Survey" />
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8125rem', padding: '1.5rem 0' }}>No active survey</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

