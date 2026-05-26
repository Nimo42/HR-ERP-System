'use client';

import { Lock, Shield, Briefcase, User, Info, Check, X } from 'lucide-react';

const ROLES = [
  {
    name: 'Admin',
    badge: '#7B5EA7',
    icon: <Lock size={20} />,
    summary: 'Full platform control. Logs in for financial sign-off, access management, system health, and auditing.',
    can: [
      'Create and deactivate HR Manager accounts',
      'Finalise and disburse payroll runs',
      'Configure all organisation settings (departments, holidays, integrations)',
      'View full audit log and session activity',
      'Export all organisation data',
    ],
    cannot: [
      'Approve or reject individual leave requests',
      'Browse employee profiles or directories',
      'Run payroll calculations (that is HR Manager\'s role)',
      'Modify leave types or attendance policies at individual level',
    ]
  },
  {
    name: 'HR Manager',
    badge: '#0891b2',
    icon: <Shield size={20} />,
    summary: 'Day-to-day people operations. Manages employees, leaves, attendance, payroll calculations, and compliance.',
    can: [
      'Add and manage Employee accounts',
      'Approve or reject leave requests',
      'View and manage attendance records',
      'Run payroll draft calculations for Admin sign-off',
      'Publish policies, announcements, and compliance documents',
      'Manage employee records and documents',
    ],
    cannot: [
      'Finalise or disburse payroll (requires Admin)',
      'Create other HR Manager accounts',
      'View the audit log',
      'Change system-level integrations or org settings',
    ]
  },
  {
    name: 'Employee',
    badge: '#6b7280',
    icon: <User size={20} />,
    summary: 'Self-service access. Can manage their own profile, leaves, attendance, and view their payslips.',
    can: [
      'Apply for leave',
      'View their own attendance records',
      'View their payslips (after Admin finalises payroll)',
      'Update personal profile and emergency contacts',
      'View company announcements and policies',
    ],
    cannot: [
      'View other employees\' data',
      'Approve any requests',
      'Access any Admin or HR Manager-level functionality',
      'Export any data',
    ]
  }
];

export default function RolesPage() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1f2937', maxWidth: 900 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Roles & Permissions</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Role permissions are fixed at the system level. This page is a reference â€” you cannot modify these permissions.
        </p>
      </div>

      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e' }}><Info size={20} /></div>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#92400e', fontWeight: 500 }}>
          Role permissions are hardcoded in the platform. They are not configurable at the client level. Review this page to understand what access you are granting when you create an HR Manager account.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {ROLES.map((role) => (
          <div key={role.name} style={{ background: '#fff', borderRadius: 18, border: '1px solid #f0ece6', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0ece6', display: 'flex', alignItems: 'center', gap: '0.875rem', background: '#faf9f8' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${role.badge}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>{role.icon}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{role.name}</h3>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: role.badge, background: `${role.badge}18`, padding: '0.125rem 0.5rem', borderRadius: 6, letterSpacing: '0.05em' }}>ROLE</span>
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5 }}>{role.summary}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.25rem 1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                  <Check size={14} /> Can do
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {role.can.map((c, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                      <span style={{ color: '#059669', marginTop: 2, flexShrink: 0 }}><Check size={14} /></span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                  <X size={14} /> Cannot do
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {role.cannot.map((c, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#374151' }}>
                      <span style={{ color: '#dc2626', marginTop: 2, flexShrink: 0 }}><X size={14} /></span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
