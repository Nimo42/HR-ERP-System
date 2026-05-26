'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronRight, Building2, UserCheck, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ROLE_COLORS = {
  'Admin': { bg: '#f3e8ff', text: '#7c3aed' },
  'HR Manager': { bg: '#fce7f3', text: '#be185d' },
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    departmentId: '',
    monthlySalary: ''
  });

  const loadEmployees = useCallback(async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    const emps = data.employees || [];
    setEmployees(emps);

    const deptMap = new Map();
    emps.forEach((e) => {
      if (e.department?.id && e.department?.name) {
        deptMap.set(e.department.id, e.department.name);
      }
    });

    const deptRows = Array.from(deptMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setDepartments(deptRows);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(async (d) => {
        setCurrentUser(d.user);
        if (d.user?.role === 'Employee') {
          router.replace(`/dashboard/directory/${d.user.id}`);
          return;
        }
        await loadEmployees();
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router, loadEmployees]);

  async function handleCreateEmployee(e) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreateLoading(true);

    try {
      const payload = {
        name: newEmployee.name.trim(),
        email: newEmployee.email.trim().toLowerCase(),
        role: 'Employee',
        monthlySalary: Number(newEmployee.monthlySalary),
      };
      if (newEmployee.departmentId) payload.departmentId = newEmployee.departmentId;

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add employee');

      await loadEmployees();
      setCreateSuccess('Employee created successfully. Temporary password is Password@123. They must change it at first login.');
      setNewEmployee({ name: '', email: '', departmentId: '', monthlySalary: '' });
    } catch (err) {
      setCreateError(err.message || 'Failed to add employee');
    } finally {
      setCreateLoading(false);
    }
  }

  const filtered = employees.filter(e => {
    const matchSearch = !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.employeeId && e.employeeId.toLowerCase().includes(search.toLowerCase()));
    const matchRole = roleFilter === 'All' || e.role === roleFilter;
    const matchDept = deptFilter === 'All' || e.department?.name === deptFilter;
    return matchSearch && matchRole && matchDept;
  });

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Directory...</div>;
  if (currentUser?.role === 'Employee') return null;

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            Employee Directory
          </h1>
          {currentUser?.role === 'HR Manager' && (
            <button
              onClick={() => {
                setCreateError('');
                setCreateSuccess('');
                setShowAddModal(true);
              }}
              style={{ padding: '0.625rem 1rem', borderRadius: 9999, border: 'none', background: '#7B5EA7', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            >
              + Add Employee
            </button>
          )}
        </div>
        <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
          {employees.length} people · {departments.length} departments
        </p>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, border: '1px solid #f0ece6', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>Add New Employee</h2>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: '0.875rem' }}>
                Close
              </button>
            </div>
            <p style={{ marginTop: 0, color: '#6b7280', fontSize: '0.8125rem' }}>
              This creates the account directly in database with role <strong>Employee</strong>.
            </p>

            <form onSubmit={handleCreateEmployee} style={{ display: 'grid', gap: '0.75rem' }}>
              <input
                required
                placeholder="Full name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee(p => ({ ...p, name: e.target.value }))}
                style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem' }}
              />
              <input
                required
                type="email"
                placeholder="Work email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee(p => ({ ...p, email: e.target.value }))}
                style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem' }}
              />
              <select
                value={newEmployee.departmentId}
                onChange={(e) => setNewEmployee(p => ({ ...p, departmentId: e.target.value }))}
                style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', background: '#fff' }}
              >
                <option value="">Department (optional)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <input
                required
                min="1"
                step="0.01"
                type="number"
                placeholder="Monthly salary"
                value={newEmployee.monthlySalary}
                onChange={(e) => setNewEmployee(p => ({ ...p, monthlySalary: e.target.value }))}
                style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem' }}
              />

              {createError && <div style={{ color: '#dc2626', fontSize: '0.8125rem' }}>{createError}</div>}
              {createSuccess && <div style={{ color: '#059669', fontSize: '0.8125rem' }}>{createSuccess}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '0.5rem 0.875rem', borderRadius: 9999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={createLoading} style={{ padding: '0.5rem 0.875rem', borderRadius: 9999, border: 'none', background: '#7B5EA7', color: '#fff', cursor: createLoading ? 'not-allowed' : 'pointer', opacity: createLoading ? 0.8 : 1 }}>
                  {createLoading ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          {['Employee', 'HR Manager', 'Admin'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          style={{ padding: '0.625rem 1rem', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: '0.875rem', background: '#fff', cursor: 'pointer' }}>
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.875rem' }}>{emp.name}</div>
                            {emp.employeeId && (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#4b5563', background: '#f3f4f6', padding: '0.0625rem 0.375rem', borderRadius: 4 }}>
                                {emp.employeeId}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Building2 size={14} color="#9ca3af" />
                        {emp.department?.name || <span style={{ color: '#d1d5db' }}>-</span>}
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
                        {emp.manager?.name || <span style={{ color: '#d1d5db' }}>-</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={14} color="#9ca3af" />
                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : <span style={{ color: '#d1d5db' }}>-</span>}
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
