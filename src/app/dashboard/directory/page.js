'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronRight, Building2, UserCheck, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ROLE_COLORS = {
  'IT Owner': { bg: '#f3e8ff', text: '#7c3aed' },
  'HR Manager': { bg: '#fce7f3', text: '#be185d' },
  'Manager': { bg: '#dbeafe', text: '#1d4ed8' },
  'Employee': { bg: '#d1fae5', text: '#065f46' },
};

export default function UnifiedDirectory() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setCurrentUser(d.user);
        if (d.user?.role === 'Employee') {
          // Redirect standard employees directly to their own profile
          router.replace(`/dashboard/directory/${d.user.id}`);
        } else {
          return fetch('/api/employees');
        }
      })
      .then(r => r ? r.json() : null)
      .then(d => {
        if (d) {
          const emps = d.employees || [];
          setEmployees(emps);
          const depts = [...new Set(emps.map(e => e.department?.name).filter(Boolean))];
          setDepartments(depts);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || e.role === roleFilter;
    const matchDept = deptFilter === 'All' || e.department?.name === deptFilter;
    return matchSearch && matchRole && matchDept;
  });

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Directory...</div>;
  if (currentUser?.role === 'Employee') return null; // handled by redirect

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          {currentUser?.role === 'Manager' ? 'My Team Directory' : 'Employee Directory'}
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
          {employees.length} people · {departments.length} departments
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.25rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', outline: 'none', background: '#fff' }}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '0.625rem 1rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}>
          <option value="All">All Roles</option>
          {['Manager', 'Employee', 'HR Manager', 'IT Owner'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          style={{ padding: '0.625rem 1rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}>
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0ece6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>No employees found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '1px solid #f0ece6' }}>
                {['Employee', 'Department', 'Role', 'Manager', 'Join Date', ''].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const roleStyle = ROLE_COLORS[emp.role] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #fafaf9', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fdfcfb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #7B5EA7, #a78bde)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.875rem' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Building2 size={14} color="#9ca3af" />
                        {emp.department?.name || <span style={{ color: '#d1d5db' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.625rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: roleStyle.bg, color: roleStyle.text }}>
                        {emp.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <UserCheck size={14} color="#9ca3af" />
                        {emp.manager?.name || <span style={{ color: '#d1d5db' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={14} color="#9ca3af" />
                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span style={{ color: '#d1d5db' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link href={`/dashboard/directory/${emp.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#7B5EA7', fontSize: '0.8125rem', fontWeight: 500 }}>
                        View <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
