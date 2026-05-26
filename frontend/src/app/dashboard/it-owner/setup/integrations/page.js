'use client';

export default function IntegrationsPage() {
  const integrations = [
    {
      id: 'resend',
      name: 'Resend',
      category: 'Email Delivery',
      desc: 'Used for sending password resets, payslips, and system notifications.',
      status: 'operational',
      icon: '✉️'
    },
    {
      id: 'twilio',
      name: 'Twilio',
      category: 'SMS & WhatsApp',
      desc: 'Used for urgent alerts, OTPs, and leave notifications on mobile.',
      status: 'unconfigured',
      icon: '💬'
    },
    {
      id: 'googleCalendar',
      name: 'Google Calendar',
      category: 'Calendar Sync',
      desc: 'Syncs approved leaves and company holidays to Google Workspace.',
      status: 'unconfigured',
      icon: '📅'
    },
    {
      id: 's3',
      name: 'AWS S3',
      category: 'Document Storage',
      desc: 'Secure storage for employee documents, policies, and payslips.',
      status: 'unconfigured',
      icon: '☁️'
    }
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Integrations</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Connect Antbox Hive to external services.</p>
      </div>

      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>🔒</span>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#92400e', fontWeight: 500 }}>
          Integration settings are configured via environment variables for security. Contact your Antbox deployment engineer to update keys.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
        {integrations.map((inv) => (
          <div key={inv.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#faf9f8', border: '1px solid #f0ece6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  {inv.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{inv.name}</h3>
                  <span style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{inv.category}</span>
                </div>
              </div>
              <div>
                {inv.status === 'operational' ? (
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '0.25rem 0.625rem', borderRadius: 9999, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }}/> Connected</span>
                ) : (
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '0.25rem 0.625rem', borderRadius: 9999 }}>Not Configured</span>
                )}
              </div>
            </div>
            
            <p style={{ fontSize: '0.8125rem', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>{inv.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
