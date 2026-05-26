'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Banknote, User, Bell, MapPin } from 'lucide-react';

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
  notification: <Bell size={16} color="#d97706" />,
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit-logs?limit=100')
      .then(res => res.json())
      .then(d => {
        if (d.logs) setLogs(d.logs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading audit log...</div>;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Audit Log</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Comprehensive, immutable record of system activity.</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 2fr 1.5fr 1.5fr 1fr', gap: '1rem', padding: '1rem 1.5rem', background: '#faf9f8', borderBottom: '1px solid #f0ece6', fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
          <div style={{ width: 24 }}></div>
          <div>Action</div>
          <div>Actor</div>
          <div>Entity</div>
          <div style={{ textAlign: 'right' }}>Time</div>
        </div>
        
        {logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No activity found.</div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id} style={{ display: 'grid', gridTemplateColumns: 'auto 2fr 1.5fr 1.5fr 1fr', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < logs.length - 1 ? '1px solid #f9f8f7' : 'none', alignItems: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f4f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {entityTypeIcon[log.entityType] || <MapPin size={16} color="#9ca3af" />}
              </div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{log.action}</div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#111827', fontWeight: 500 }}>{log.actor}</div>
                <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{log.actorRole}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>{log.entity}</div>
                <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{log.entityType}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                {timeAgo(log.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
