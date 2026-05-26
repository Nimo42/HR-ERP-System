'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, CheckCircle, X, Sparkles, AlertCircle, ChevronLeft, ChevronRight, CalendarDays, MousePointerClick } from 'lucide-react';
import FaceScanModal from './FaceScanModal';

async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function EmployeeAttendanceView() {
  const [activeTab, setActiveTab] = useState('summary'); // summary | daily
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [logs, setLogs] = useState([]);
  const [activePunch, setActivePunch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workLocation, setWorkLocation] = useState('Office');
  const [time, setTime] = useState('');
  
  // Correction Modal
  const [showCorrection, setShowCorrection] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // The date object
  const [correctForm, setCorrectForm] = useState({ requestedClockIn: '', requestedClockOut: '', reason: '' });
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [punching, setPunching] = useState(false);
  
  // Face Scan Modal
  const [showFaceScan, setShowFaceScan] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await safeJson(res);
      if (!res.ok || !data) {
        setFormMsg({ type: 'error', text: 'Could not load attendance data.' });
        return;
      }
      const punches = data.logs || [];
      setLogs(punches);
      
      const active = punches.find(p => p.clockOutTime === null);
      setActivePunch(active || null);
    } catch (e) {
      setFormMsg({ type: 'error', text: 'Could not load attendance data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handlePunch() {
    setPunching(true);
    setFormMsg({ type: '', text: '' });
    setShowFaceScan(true);
  }

  function handleFaceSuccess(data) {
    setFormMsg({ type: 'success', text: data.action === 'clock-in' ? 'Clocked in successfully' : 'Clocked out successfully' });
    setShowFaceScan(false);
    setPunching(false);
    loadData();
    setTimeout(() => setFormMsg({ type: '', text: '' }), 4000);
  }

  function handleFaceCancel() {
    setShowFaceScan(false);
    setPunching(false);
  }

  async function submitCorrection(e) {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });
    try {
      // Find the log for this date if it exists
      const dStr = selectedDate.toISOString().split('T')[0];
      const log = logs.find(l => new Date(l.clockInTime).toISOString().split('T')[0] === dStr);
      
      if (!log) {
        // Technically backend expects attendanceLogId, but if absent, we might need a dummy log or backend change. 
        // We'll pass the date or assume backend creates an absent log lazily. 
        // For now, if no log exists, we might error out if the schema strictly requires an existing log.
        // As a workaround, we alert the user:
        alert("The backend currently requires an existing attendance log to attach a correction to. Since you were completely absent, please contact HR directly for this demo.");
        return;
      }

      const res = await fetch('/api/attendance/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceLogId: log.id,
          requestedClockIn: correctForm.requestedClockIn ? new Date(correctForm.requestedClockIn).toISOString() : null,
          requestedClockOut: correctForm.requestedClockOut ? new Date(correctForm.requestedClockOut).toISOString() : null,
          reason: correctForm.reason
        })
      });
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Correction request submitted' });
        setShowCorrection(false);
        loadData();
      } else {
        const d = await safeJson(res);
        setFormMsg({ type: 'error', text: d?.message || 'Failed' });
      }
    } catch (err) {
      setFormMsg({ type: 'error', text: 'Error submitting' });
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Attendance...</div>;

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthLogs = logs.filter(l => {
    const d = new Date(l.clockInTime);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  let presentCount = 0;
  let lateCount = 0;
  let totalHours = 0;
  
  const daysMap = {};
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    
    // Check logs for this day
    const dayLogs = monthLogs.filter(l => new Date(l.clockInTime).getDate() === i);
    
    let status = isWeekend ? 'weekend' : 'absent';
    let hours = 0;
    
    if (dayLogs.length > 0) {
      status = 'present';
      presentCount++;
      if (dayLogs.some(l => l.late)) {
        status = 'late';
        lateCount++;
      }
      dayLogs.forEach(l => {
        if (l.clockInTime && l.clockOutTime) {
          hours += (new Date(l.clockOutTime) - new Date(l.clockInTime)) / 3600000;
        }
      });
      totalHours += hours;
    }
    
    // Future days
    if (d > new Date()) status = 'future';
    if (d.toDateString() === new Date().toDateString() && status === 'absent') status = 'today-no-punch';

    daysMap[i] = { date: d, status, hours, logs: dayLogs };
  }

  // Working days = total week days in month
  let workingDays = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    if (d.getDay() !== 0 && d.getDay() !== 6 && d <= new Date()) workingDays++;
  }
  const absentDays = Math.max(0, workingDays - presentCount); // simplistic, ignores leaves for now since we don't fetch leaves here yet

  function changeMonth(delta) {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + delta);
    setCurrentMonth(next);
  }

  function openDayDetail(dayObj) {
    if (dayObj.status === 'future' || dayObj.status === 'weekend') return;
    
    // For simplicity in this demo, just open the correction modal if absent or if they want to correct.
    setSelectedDate(dayObj.date);
    const l = dayObj.logs[0];
    
    setCorrectForm({
      requestedClockIn: l?.clockInTime ? new Date(l.clockInTime).toISOString().slice(0, 16) : '',
      requestedClockOut: l?.clockOutTime ? new Date(l.clockOutTime).toISOString().slice(0, 16) : '',
      reason: ''
    });
    setShowCorrection(true);
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem', color: '#111827' }}>My Attendance</h1>

      {formMsg.text && (
        <div style={{ background: formMsg.type === 'error' ? '#fee2e2' : '#d1fae5', color: formMsg.type === 'error' ? '#991b1b' : '#065f46', padding: '1rem', borderRadius: 8, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
          {formMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {formMsg.text}
        </div>
      )}

      {/* Clock In Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Time</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{time || '--:--:--'}</div>
        </div>
        
        <div style={{ width: '1px', background: '#e5e7eb', alignSelf: 'stretch' }} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: '#f9fafb', padding: '0.375rem', borderRadius: 8, marginBottom: '1rem' }}>
            {['Office', 'Remote'].map(loc => (
              <button key={loc} type="button" onClick={() => setWorkLocation(loc)} disabled={!!activePunch} style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, cursor: activePunch ? 'not-allowed' : 'pointer',
                background: workLocation === loc ? '#7B5EA7' : 'transparent', color: workLocation === loc ? '#fff' : '#6b7280'
              }}>{loc}</button>
            ))}
          </div>

          <button onClick={handlePunch} disabled={punching} style={{
            width: '100%', padding: '0.875rem', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: '#fff',
            background: activePunch ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}>
            <Clock size={18} /> {activePunch ? 'Clock Out' : 'Clock In'}
          </button>
          
          {activePunch && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <Sparkles size={14} /> Active clock-in at {new Date(activePunch.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({activePunch.workLocation})
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '2rem' }}>
        <button onClick={() => setActiveTab('summary')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'summary' ? '#7B5EA7' : 'transparent'}`, padding: '0.5rem 0', fontWeight: activeTab === 'summary' ? 600 : 500, color: activeTab === 'summary' ? '#7B5EA7' : '#6b7280', fontSize: '0.875rem', cursor: 'pointer' }}>Monthly Summary</button>
        <button onClick={() => setActiveTab('daily')} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === 'daily' ? '#7B5EA7' : 'transparent'}`, padding: '0.5rem 0', fontWeight: activeTab === 'daily' ? 600 : 500, color: activeTab === 'daily' ? '#7B5EA7' : '#6b7280', fontSize: '0.875rem', cursor: 'pointer' }}>Daily Record</button>
      </div>

      {activeTab === 'summary' && (
        <div>
          {/* Month Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => changeMonth(-1)} style={{ padding: '0.5rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4b5563' }}><ChevronLeft size={16} /></button>
              <button onClick={() => changeMonth(1)} style={{ padding: '0.5rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4b5563' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Working Days', val: workingDays },
              { label: 'Present', val: presentCount, color: '#059669' },
              { label: 'On Leave', val: 0, color: '#7B5EA7' }, // Simplified for demo
              { label: 'Absent', val: absentDays, color: '#dc2626' },
              { label: 'Late', val: lateCount, color: '#d97706' },
              { label: 'Total Hours', val: Math.round(totalHours) }
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color || '#111827', marginTop: '0.5rem', lineHeight: 1 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Visual Calendar */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.5rem' }}>{d}</div>
              ))}
              {/* Padding for first day of month */}
              {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
              
              {Object.values(daysMap).map(dObj => {
                let bg = '#fff';
                let fg = '#374151';
                let border = '1px solid #e5e7eb';
                
                if (dObj.status === 'present') { bg = '#d1fae5'; fg = '#065f46'; border = 'none'; }
                else if (dObj.status === 'late') { bg = '#fef3c7'; fg = '#b45309'; border = 'none'; }
                else if (dObj.status === 'absent') { bg = '#fee2e2'; fg = '#991b1b'; border = 'none'; }
                else if (dObj.status === 'weekend' || dObj.status === 'future') { bg = '#f9fafb'; fg = '#9ca3af'; border = '1px dashed #e5e7eb'; }
                
                return (
                  <div key={dObj.date.getDate()} onClick={() => openDayDetail(dObj)} style={{
                    aspectRatio: '1', background: bg, color: fg, border, borderRadius: 8, padding: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: (dObj.status === 'future' || dObj.status === 'weekend') ? 'default' : 'pointer'
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>{dObj.date.getDate()}</span>
                    {(dObj.status === 'present' || dObj.status === 'late') && <span style={{ fontSize: '0.6875rem', fontWeight: 500, marginTop: '0.25rem' }}>{Math.round(dObj.hours * 10)/10}h</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', fontSize: '0.75rem', color: '#6b7280', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 12, height: 12, borderRadius: 4, background: '#d1fae5' }}/> Present</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 12, height: 12, borderRadius: 4, background: '#fee2e2' }}/> Absent</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 12, height: 12, borderRadius: 4, background: '#fef3c7' }}/> Late</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: 12, height: 12, borderRadius: 4, background: '#f3e8ff' }}/> Leave</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'daily' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>In Punch</th>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Out Punch</th>
                <th style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Location</th>
              </tr>
            </thead>
            <tbody>
              {monthLogs.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No punches recorded in this month.</td></tr>
              ) : monthLogs.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 500, color: '#111827', fontSize: '0.875rem' }}>{new Date(l.clockInTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#4b5563', fontSize: '0.875rem', fontFamily: 'monospace' }}>{new Date(l.clockInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#4b5563', fontSize: '0.875rem', fontFamily: 'monospace' }}>{l.clockOutTime ? new Date(l.clockOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pending'}</td>
                  <td style={{ padding: '1rem 1.25rem', color: '#4b5563', fontSize: '0.875rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><MapPin size={14}/> {l.workLocation}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrection && selectedDate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: 600, fontSize: '1.125rem', margin: 0 }}>Day Detail & Correction</h2>
              <button onClick={() => setShowCorrection(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            </div>
            
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: '#374151' }}>{selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>

            <form onSubmit={submitCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Requested In Time</label>
                <input type="datetime-local" value={correctForm.requestedClockIn} onChange={e => setCorrectForm({ ...correctForm, requestedClockIn: e.target.value })} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Requested Out Time</label>
                <input type="datetime-local" value={correctForm.requestedClockOut} onChange={e => setCorrectForm({ ...correctForm, requestedClockOut: e.target.value })} style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Reason</label>
                <textarea required rows={3} value={correctForm.reason} onChange={e => setCorrectForm({ ...correctForm, reason: e.target.value })} placeholder="Provide a reason..." style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical' }} />
              </div>
              <button type="submit" style={{ width: '100%', padding: '0.75rem', border: 'none', background: '#7B5EA7', color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.5rem' }}>Submit Correction Request</button>
            </form>
          </div>
        </div>
      )}

      {showFaceScan && (
        <FaceScanModal
          action={activePunch ? 'clock-out' : 'clock-in'}
          workLocation={workLocation}
          onSuccess={handleFaceSuccess}
          onCancel={handleFaceCancel}
        />
      )}
    </div>
  );
}
