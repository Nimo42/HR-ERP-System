'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, AlertCircle, CheckCircle, HelpCircle, Eye, ArrowRight, CornerDownRight, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import EmployeeAttendanceView from '../../../components/EmployeeAttendanceView';

async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    return { __nonJson: true, text };
  }
  return res.json();
}

export default function UnifiedAttendancePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('clock'); // clock | corrections | analytics
  const [workLocation, setWorkLocation] = useState('Office');
  const [activePunch, setActivePunch] = useState(null);

  // Stats
  const [stats, setStats] = useState({ present: 0, late: 0, overtime: 0, totalHours: 0 });

  // Modals state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [correctForm, setCorrectForm] = useState({ requestedClockIn: '', requestedClockOut: '', reason: '' });

  // HR Notes for Correction Resolution
  const [resolutionNotes, setResolutionNotes] = useState({});

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [punching, setPunching] = useState(false);
  const [manualTargets, setManualTargets] = useState([]);
  const [manualTargetId, setManualTargetId] = useState('');
  const [manualWorkLocation, setManualWorkLocation] = useState('Office');
  const [hrStats, setHrStats] = useState(null);

  // Time ticker
  const [time, setTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadAll() {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await safeJson(meRes);
      if (!meRes.ok || meData?.__nonJson || !meData?.user) {
        setFormError('Session expired. Please sign in again.');
        router.replace('/');
        return;
      }
      setCurrentUser(meData.user);

      const logsRes = await fetch('/api/attendance');
      const logsData = await safeJson(logsRes);
      if (!logsRes.ok || logsData?.__nonJson) {
        setFormError('Could not load attendance data.');
        setLogs([]);
        setActivePunch(null);
        return;
      }
      const punches = logsData.logs || [];
      setLogs(punches);

      // Check active clock-in
      const active = punches.find(p => p.clockOutTime === null);
      setActivePunch(active || null);

      // Compute simple stats for the employee
      const presentCount = punches.length;
      const lateCount = punches.filter(p => p.late).length;
      const overtimeCount = punches.filter(p => p.overtime).length;
      let totalHours = 0;
      punches.forEach(p => {
        if (p.clockInTime && p.clockOutTime) {
          totalHours += (new Date(p.clockOutTime) - new Date(p.clockInTime)) / (1000 * 60 * 60);
        }
      });
      setStats({
        present: presentCount,
        late: lateCount,
        overtime: overtimeCount,
        totalHours: Math.round(totalHours * 10) / 10
      });

      // Load corrections if HR or Admin
      if (['HR Manager', 'Admin'].includes(meData.user?.role)) {
        const statsRes = await fetch('/api/dashboard/stats');
        if (statsRes.ok) {
          const s = await safeJson(statsRes);
          setHrStats(s?.__nonJson ? null : (s.stats || null));
        }

        const corRes = await fetch('/api/attendance/corrections');
        const corData = await safeJson(corRes);
        if (!corRes.ok || corData?.__nonJson) {
          setCorrections([]);
          return;
        }
        setCorrections(corData.corrections || []);

        const empRes = await fetch('/api/employees');
        const empData = await safeJson(empRes);
        if (!empRes.ok || empData?.__nonJson) {
          setManualTargets([]);
          setManualTargetId('');
          return;
        }
        const allUsers = empData.employees || [];
        const allowedTargets = meData.user.role === 'Admin'
          ? allUsers.filter(u => u.role === 'HR Manager')
          : allUsers.filter(u => u.role === 'Employee');
        setManualTargets(allowedTargets);
        if (allowedTargets.length > 0) setManualTargetId(allowedTargets[0].id);
      }
    } catch (e) {
      setFormError('Failed to load attendance workspace.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Clock In/Out Action
  async function handleClockAction() {
    setPunching(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workLocation })
      });
      const data = await safeJson(res);
      if (data?.__nonJson) {
        setFormError('Invalid server response. Please sign in again.');
        return;
      }
      if (res.ok) {
        setFormSuccess(data.action === 'clock-in' ? 'Clocked in successfully!' : 'Clocked out successfully!');
        loadAll();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        setFormError(data.message || 'Operation failed');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setPunching(false);
    }
  }

  // Open Correction Modal
  function openCorrection(log) {
    setSelectedLog(log);
    setCorrectForm({
      requestedClockIn: log.clockInTime ? new Date(log.clockInTime).toISOString().slice(0, 16) : '',
      requestedClockOut: log.clockOutTime ? new Date(log.clockOutTime).toISOString().slice(0, 16) : '',
      reason: ''
    });
    setFormError('');
    setShowCorrectionModal(true);
  }

  // Submit Correction Request
  async function handleCorrectionSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      const res = await fetch('/api/attendance/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceLogId: selectedLog.id,
          requestedClockIn: correctForm.requestedClockIn ? new Date(correctForm.requestedClockIn).toISOString() : null,
          requestedClockOut: correctForm.requestedClockOut ? new Date(correctForm.requestedClockOut).toISOString() : null,
          reason: correctForm.reason
        })
      });
      if (res.ok) {
        setFormSuccess('Correction request submitted to HR.');
        setShowCorrectionModal(false);
        loadAll();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        const data = await safeJson(res);
        setFormError(data.message || 'Submission failed');
      }
    } catch (err) {
      setFormError('Submission failed.');
    }
  }

  // Approve/Reject Correction Request (HR)
  async function resolveCorrection(id, status) {
    const note = resolutionNotes[id] || '';
    try {
      const res = await fetch('/api/attendance/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, note })
      });
      if (res.ok) {
        setFormSuccess(`Correction request ${status.toLowerCase()}!`);
        loadAll();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        const data = await safeJson(res);
        alert(data.message || 'Failed to update request');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleManualOverridePunch() {
    if (!manualTargetId) {
      setFormError('Please select a user for manual punch override.');
      return;
    }
    setPunching(true);
    setFormError('');
    setFormSuccess('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: manualTargetId, workLocation: manualWorkLocation })
      });
      const data = await safeJson(res);
      if (data?.__nonJson) {
        setFormError('Invalid server response. Please sign in again.');
        return;
      }
      if (res.ok) {
        const actionText = data.action === 'clock-in' ? 'clocked in' : 'clocked out';
        setFormSuccess(`${data.targetUserName || 'User'} ${actionText} manually.`);
        loadAll();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        setFormError(data.message || 'Manual override failed');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setPunching(false);
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Attendance Workspace...</div>;

  const isHR = ['HR Manager', 'Admin'].includes(currentUser?.role);

  return (
    <div style={{ maxWidth: '1200px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Attendance Center</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>Track clock-ins, review logs, and manage corrections.</p>
        </div>

        {/* HR Sub-tabs */}
        {isHR && (
          <div style={{ display: 'flex', gap: '0.25rem', background: '#f0ece6', padding: '0.25rem', borderRadius: 10 }}>
            {['clock', 'corrections', 'analytics'].map(t => (
              <button key={t} onClick={() => setActiveSubTab(t)} style={{
                textTransform: 'capitalize', padding: '0.5rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                background: activeSubTab === t ? '#fff' : 'transparent',
                color: activeSubTab === t ? '#7B5EA7' : '#4b5563',
                fontWeight: activeSubTab === t ? 600 : 500, fontSize: '0.875rem',
                boxShadow: activeSubTab === t ? '0 1px 3px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.15s'
              }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {formError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <ShieldAlert size={16} /> {formError}
        </div>
      )}
      {formSuccess && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <CheckCircle size={16} /> {formSuccess}
        </div>
      )}

      {/* ==================== CLOCK-IN CARD & DAILY SUMMARY ==================== */}
      {activeSubTab === 'clock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <EmployeeAttendanceView />
          {isHR && (
            <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Manual Punch Override</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.5rem 0 1rem' }}>
                Use this only when face verification fails. Admin can punch HR Managers. HR can punch Employees.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>Select User</label>
                  <select value={manualTargetId} onChange={e => setManualTargetId(e.target.value)} style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    {manualTargets.length === 0 ? (
                      <option value="">No eligible users</option>
                    ) : (
                      manualTargets.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)
                    )}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>Work Location</label>
                  <select value={manualWorkLocation} onChange={e => setManualWorkLocation(e.target.value)} style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <option value="Office">Office</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
                <button onClick={handleManualOverridePunch} disabled={punching || !manualTargetId} style={{ padding: '0.625rem 1rem', border: 'none', borderRadius: 8, background: '#7B5EA7', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                  {punching ? 'Processing...' : 'Manual Clock In/Out'}
                </button>
              </div>
            </div>
          )}
          </div>
      )}

      {/* ==================== HR CORRECTIONS APPROVAL TAB ==================== */}
      {isHR && activeSubTab === 'corrections' && (
        <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0ece6', fontWeight: 600 }}>Pending Punch Correction Requests</div>
          {corrections.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No correction requests currently pending review.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {corrections.map(req => {
                const isPending = req.status === 'Pending';
                return (
                  <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', borderBottom: '1px solid #fafaf9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7B5EA7, #a78bde)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
                          {req.user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{req.user?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Submitted {new Date(req.createdAt).toLocaleDateString('en-IN')}</div>
                        </div>
                      </div>
                      <span style={{
                        padding: '0.2rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                        background: req.status === 'Approved' ? '#d1fae5' : req.status === 'Rejected' ? '#fee2e2' : '#fef9c3',
                        color: req.status === 'Approved' ? '#065f46' : req.status === 'Rejected' ? '#991b1b' : '#854d0e'
                      }}>{req.status}</span>
                    </div>

                    <div style={{ background: '#fafaf9', padding: '1rem', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', fontSize: '0.8125rem' }}>
                      <div>
                        <div style={{ color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Original Logs</div>
                        <div style={{ marginTop: '0.25rem', fontWeight: 500 }}>
                          In: {new Date(req.attendanceLog?.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontWeight: 500 }}>
                          Out: {req.attendanceLog?.clockOutTime ? new Date(req.attendanceLog.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'â€”'}
                        </div>
                      </div>
                      <ArrowRight size={16} color="#9ca3af" />
                      <div>
                        <div style={{ color: '#7B5EA7', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Requested Adjustment</div>
                        <div style={{ marginTop: '0.25rem', fontWeight: 600, color: '#7B5EA7' }}>
                          In: {req.requestedClockIn ? new Date(req.requestedClockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'â€”'}
                        </div>
                        <div style={{ fontWeight: 600, color: '#7B5EA7' }}>
                          Out: {req.requestedClockOut ? new Date(req.requestedClockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'â€”'}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: '#4b5563', padding: '0 0.5rem' }}>
                      <strong>Reason:</strong> "{req.reason}"
                    </div>

                    {isPending ? (
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', background: '#fafaf9', padding: '0.75rem', borderRadius: 8 }}>
                        <input 
                          placeholder="Resolution note (optional)..." 
                          value={resolutionNotes[req.id] || ''}
                          onChange={e => setResolutionNotes({ ...resolutionNotes, [req.id]: e.target.value })}
                          style={{ flex: 1, padding: '0.4rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.8125rem' }}
                        />
                        <button onClick={() => resolveCorrection(req.id, 'Approved')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <Check size={14} /> Approve
                        </button>
                        <button onClick={() => resolveCorrection(req.id, 'Rejected')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                          <X size={14} /> Reject
                        </button>
                      </div>
                    ) : (
                      req.note && <div style={{ fontSize: '0.8125rem', color: '#9ca3af', padding: '0 0.5rem' }}>
                        <strong>HR Note:</strong> "{req.note}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== HR ANALYTICS CHART TAB ==================== */}
      {isHR && activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* departmental rate */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Department Attendance Rates This Month</h2>
            {!hrStats?.deptRates || hrStats.deptRates.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No department attendance data available yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {hrStats.deptRates.map(row => (
                <div key={row.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 500 }}>
                    <span>{row.name}</span>
                    <strong style={{ color: '#7B5EA7' }}>{row.rate}%</strong>
                  </div>
                  {/* Dynamic SVG bar chart */}
                  <div style={{ height: 12, background: '#f0ece6', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #7B5EA7, #a78bde)', width: `${row.rate}%`, borderRadius: 999, transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>

          {/* Late arrival trends */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Attendance Snapshot</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ background: '#fafaf9', border: '1px solid #f0ece6', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Late Arrivals (Today)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{hrStats?.lateArrivals ?? 0}</div>
              </div>
              <div style={{ background: '#fafaf9', border: '1px solid #f0ece6', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>Overtime (Month)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7B5EA7' }}>{hrStats?.overtimeCount ?? 0}</div>
              </div>
              <div style={{ background: '#fafaf9', border: '1px solid #f0ece6', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>On Leave Today</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{hrStats?.onLeaveToday ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CORRECTION MODAL ==================== */}
      {showCorrectionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 450, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Request Punch Correction</h2>
              <button onClick={() => setShowCorrectionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCorrectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Requested Clock-In</label>
                <input type="datetime-local" required value={correctForm.requestedClockIn} onChange={e => setCorrectForm({ ...correctForm, requestedClockIn: e.target.value })}
                  style={{ padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Requested Clock-Out</label>
                <input type="datetime-local" required value={correctForm.requestedClockOut} onChange={e => setCorrectForm({ ...correctForm, requestedClockOut: e.target.value })}
                  style={{ padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Reason for correction</label>
                <textarea required rows={3} value={correctForm.reason}
                  onChange={e => setCorrectForm({ ...correctForm, reason: e.target.value })}
                  placeholder="e.g. Forgot to clock out at shift end..."
                  style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCorrectionModal(false)} style={{ flex: 1, padding: '0.625rem', border: '1px solid #e5e7eb', background: '#fff', color: '#4b5563', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.625rem', border: 'none', background: '#7B5EA7', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

