'use client';

import { useEffect, useState } from 'react';
import { Clock, MapPin, AlertCircle, CheckCircle, HelpCircle, Eye, ArrowRight, CornerDownRight, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function UnifiedAttendancePage() {
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
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const logsRes = await fetch('/api/attendance');
      const logsData = await logsRes.json();
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

      // Load corrections if HR or IT Owner
      if (['HR Manager', 'IT Owner'].includes(meData.user?.role)) {
        const corRes = await fetch('/api/attendance/corrections');
        const corData = await corRes.json();
        setCorrections(corData.corrections || []);
      }
    } catch (e) {
      console.error(e);
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
      const data = await res.json();
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
        const data = await res.json();
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
        const data = await res.json();
        alert(data.message || 'Failed to update request');
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Attendance Workspace...</div>;

  const isHR = ['HR Manager', 'IT Owner'].includes(currentUser?.role);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Punching Controls Card */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '100%', borderBottom: '1px solid #fafaf9', paddingBottom: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Time</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', marginTop: '0.25rem', fontFamily: 'monospace' }}>{time || '--:--:--'}</div>
            </div>

            <div style={{ width: '100%' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '0.5rem' }}>Location Setting</label>
              <div style={{ display: 'flex', gap: '0.5rem', background: '#fafaf9', padding: '0.25rem', borderRadius: 8 }}>
                {['Office', 'Remote'].map(loc => (
                  <button key={loc} type="button" onClick={() => setWorkLocation(loc)} disabled={!!activePunch} style={{
                    flex: 1, padding: '0.375rem', border: 'none', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, cursor: activePunch ? 'not-allowed' : 'pointer',
                    background: workLocation === loc ? '#7B5EA7' : 'transparent',
                    color: workLocation === loc ? '#fff' : '#6b7280',
                    transition: 'all 0.15s'
                  }}>{loc}</button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleClockAction}
              disabled={punching}
              style={{
                width: '100%',
                padding: '1rem',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '1rem',
                color: '#fff',
                background: activePunch ? '#ef4444' : '#10b981',
                boxShadow: activePunch ? '0 4px 14px rgba(239, 68, 68, 0.2)' : '0 4px 14px rgba(16, 185, 129, 0.2)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Clock size={18} />
              {activePunch ? 'Clock Out' : 'Clock In'}
            </button>

            {activePunch && (
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#fffbeb', padding: '0.5rem', borderRadius: 8, border: '1px solid #fef3c7' }}>
                <Sparkles size={14} /> Active clock-in at {new Date(activePunch.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({activePunch.workLocation})
              </div>
            )}
          </div>

          {/* Monthly Logs & Personal KPI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Summary strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Present Days', value: stats.present },
                { label: 'Late Arrivals', value: stats.late, color: stats.late > 0 ? '#ef4444' : '#111827' },
                { label: 'Overtime Days', value: stats.overtime, color: '#10b981' },
                { label: 'Hours Worked', value: `${stats.totalHours}h` }
              ].map(card => (
                <div key={card.label} style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 12, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{card.label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: card.color || '#111827' }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Punches table */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0ece6', fontWeight: 600 }}>My Logs This Month</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f0ece6' }}>
                    {['Date', 'Type', 'In Punch', 'Out Punch', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No logs registered this month.</td>
                    </tr>
                  ) : logs.map(log => {
                    const clockInStr = log.clockInTime ? new Date(log.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const clockOutStr = log.clockOutTime ? new Date(log.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Pending';

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #fafaf9' }}>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>
                          {new Date(log.clockInTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={12} color="#9ca3af" /> {log.workLocation}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: '#111827', fontWeight: 500 }}>{clockInStr}</td>
                        <td style={{ padding: '0.875rem 1rem', color: log.clockOutTime ? '#111827' : '#9ca3af', fontWeight: 500 }}>{clockOutStr}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {log.late && <span style={{ padding: '0.125rem 0.5rem', background: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: 600, borderRadius: 4 }}>Late</span>}
                            {log.overtime && <span style={{ padding: '0.125rem 0.5rem', background: '#d1fae5', color: '#065f46', fontSize: '0.7rem', fontWeight: 600, borderRadius: 4 }}>Overtime</span>}
                            {!log.late && !log.overtime && <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Regular</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          {log.clockOutTime && (
                            <button onClick={() => openCorrection(log)} style={{ background: 'none', border: 'none', color: '#7B5EA7', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                              Correction
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
                          Out: {req.attendanceLog?.clockOutTime ? new Date(req.attendanceLog.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </div>
                      <ArrowRight size={16} color="#9ca3af" />
                      <div>
                        <div style={{ color: '#7B5EA7', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>Requested Adjustment</div>
                        <div style={{ marginTop: '0.25rem', fontWeight: 600, color: '#7B5EA7' }}>
                          In: {req.requestedClockIn ? new Date(req.requestedClockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                        <div style={{ fontWeight: 600, color: '#7B5EA7' }}>
                          Out: {req.requestedClockOut ? new Date(req.requestedClockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {[
                { dept: 'Engineering', rate: 94 },
                { dept: 'Human Resources', rate: 100 },
                { dept: 'Management', rate: 88 },
                { dept: 'Operations', rate: 92 }
              ].map(row => (
                <div key={row.dept} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 500 }}>
                    <span>{row.dept}</span>
                    <strong style={{ color: '#7B5EA7' }}>{row.rate}%</strong>
                  </div>
                  {/* Dynamic SVG bar chart */}
                  <div style={{ height: 12, background: '#f0ece6', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #7B5EA7, #a78bde)', width: `${row.rate}%`, borderRadius: 999, transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Late arrival trends */}
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Late Arrival Spikes (Weekly Breakdown)</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', paddingTop: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f0ece6' }}>
              {[
                { week: 'Week 1', count: 3 },
                { week: 'Week 2', count: 8 },
                { week: 'Week 3', count: 2 },
                { week: 'Week 4', count: 5 }
              ].map(col => {
                const max = 10;
                const heightPercent = (col.count / max) * 100;
                return (
                  <div key={col.week} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>{col.count} cases</div>
                    <div style={{ height: '100px', width: '32px', background: '#fee2e2', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ height: `${heightPercent}%`, width: '100%', background: '#ef4444', borderRadius: '6px 6px 0 0' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{col.week}</span>
                  </div>
                );
              })}
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
                <textarea required rows={3} value={correctForm.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
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
