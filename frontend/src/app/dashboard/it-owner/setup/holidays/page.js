'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HolidaysPage() {
  const [viewDate, setViewDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState('');
  const [error, setError] = useState('');

  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();

  const holidaySet = useMemo(() => {
    return new Set(holidays.map((h) => toYmd(new Date(h.date))));
  }, [holidays]);

  async function load(targetYear = year) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/org-settings?year=${targetYear}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to load holiday calendar.');
        setHolidays([]);
      } else {
        setHolidays(data.holidays || []);
      }
    } catch {
      setError('Failed to load holiday calendar.');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(year);
  }, [year]);

  async function toggleHoliday(dateObj) {
    const date = toYmd(dateObj);
    setSavingDate(date);
    setError('');
    try {
      const res = await fetch('/api/admin/org-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'holiday',
          data: {
            action: 'toggle',
            year: dateObj.getFullYear(),
            date,
            name: `Holiday - ${date}`
          }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to update holiday.');
      } else {
        await load(dateObj.getFullYear());
      }
    } catch {
      setError('Failed to update holiday.');
    } finally {
      setSavingDate('');
    }
  }

  function moveMonth(delta) {
    setViewDate((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  }

  function renderMonth(monthToRender) {
    const firstDay = new Date(year, monthToRender, 1);
    const daysInMonth = new Date(year, monthToRender + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    const cells = [];

    for (let i = 0; i < leadingBlanks; i++) cells.push(<div key={`blank-${monthToRender}-${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, monthToRender, d);
      const ymd = toYmd(dateObj);
      const isHoliday = holidaySet.has(ymd);
      const isSaving = savingDate === ymd;
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      cells.push(
        <button
          key={ymd}
          onClick={() => toggleHoliday(dateObj)}
          disabled={isSaving}
          title={isHoliday ? 'Click to remove holiday' : 'Click to mark holiday'}
          style={{
            border: isHoliday ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
            background: isHoliday ? '#ecfdf5' : '#fff',
            color: isHoliday ? '#166534' : (isWeekend ? '#9ca3af' : '#374151'),
            borderRadius: 8,
            height: 32,
            fontSize: '0.75rem',
            cursor: isSaving ? 'wait' : 'pointer',
            fontWeight: isHoliday ? 700 : 500,
            opacity: isSaving ? 0.65 : 1
          }}
        >
          {d}
        </button>
      );
    }

    return (
      <div key={monthToRender} style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0ece6', fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>
          {MONTHS[monthToRender]} {year}
        </div>
        <div style={{ padding: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', marginBottom: '0.5rem' }}>
            {WEEKDAYS.map((w) => (
              <div key={`${monthToRender}-${w}`} style={{ textAlign: 'center', fontSize: '0.68rem', color: '#9ca3af', fontWeight: 700 }}>
                {w}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
            {cells}
          </div>
        </div>
      </div>
    );
  }

  const holidaysThisMonth = holidays.filter((h) => new Date(h.date).getMonth() === monthIndex && new Date(h.date).getFullYear() === year);

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>Holiday Calendar</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.35rem 0 0' }}>Use the arrows to move month by month and mark paid holidays for payroll calculations.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => moveMonth(-1)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ChevronLeft size={16} /> Prev Month
          </button>
          <div style={{ minWidth: 160, textAlign: 'center', fontWeight: 800, color: '#111827' }}>
            {MONTHS[monthIndex]} {year}
          </div>
          <button onClick={() => moveMonth(1)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            Next Month <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && <div style={{ marginBottom: '1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{error}</div>}

      <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#4b5563' }}>
        Selected holidays in {MONTHS[monthIndex]} {year}: <strong>{holidaysThisMonth.length}</strong>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: '#6b7280' }}>Loading holiday calendar...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1rem' }}>
          {renderMonth(monthIndex)}
        </div>
      )}
    </div>
  );
}
