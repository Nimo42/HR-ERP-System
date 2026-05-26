'use client';

export default function DataExportPage() {
  const handleExport = async (type) => {
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `antbox_export_${type}_${new Date().getTime()}.${type === 'full' ? 'json' : 'csv'}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert('Error exporting data: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Data Export</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Request secure dumps of organisation data.</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
          Select the data you wish to export. The system will compile the records and immediately download a secure CSV file directly to your system.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {[
            { id: 'full', name: 'Full Database Dump', desc: 'Complete export of all tables (JSON format). Excludes physical files.' },
            { id: 'audit', name: 'Complete Audit Log', desc: 'CSV export of all historical system activity and session logs.' },
            { id: 'payroll', name: 'Payroll Master Report', desc: 'CSV export of all finalised payroll runs and employee payslips across all time.' }
          ].map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: '#faf9f8', border: '1px solid #f0ece6', borderRadius: 12, transition: 'all 0.2s', cursor: 'default' }}
                 onMouseEnter={ev => { ev.currentTarget.style.background = '#fff'; ev.currentTarget.style.borderColor = '#d4c8f0'; ev.currentTarget.style.boxShadow = '0 4px 12px rgba(123,94,167,0.08)'; }}
                 onMouseLeave={ev => { ev.currentTarget.style.background = '#faf9f8'; ev.currentTarget.style.borderColor = '#f0ece6'; ev.currentTarget.style.boxShadow = 'none'; }}>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>{e.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>{e.desc}</p>
              </div>
              <button onClick={() => handleExport(e.id)} style={{ padding: '0.625rem 1.25rem', background: '#7B5EA7', border: 'none', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#6d4fa0'}
                onMouseLeave={ev => ev.currentTarget.style.background = '#7B5EA7'}>
                Download CSV
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
