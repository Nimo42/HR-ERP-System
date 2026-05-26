"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Briefcase, 
  Settings, 
  FileCheck, 
  ShieldAlert, 
  Megaphone, 
  UserCircle,
  GitFork,
  LogOut
} from 'lucide-react';

// Define the full permission matrix for sidebars
const ROLE_MENUS = {
  "IT Owner": [
    { name: 'Org Setup', path: '/setup', icon: LayoutDashboard },
    { name: 'System Settings', path: '/dashboard/it-owner/settings', icon: Settings },
    { name: 'Employee Directory', path: '/dashboard/directory', icon: Users },
    { name: 'Attendance Logs', path: '/dashboard/attendance', icon: CalendarDays },
    { name: 'Payroll Finalise', path: '/dashboard/payroll', icon: Briefcase },
    { name: 'Compliance Logs', path: '/dashboard/compliance', icon: ShieldAlert },
    { name: 'Bulletins & Surveys', path: '/dashboard/announcements', icon: Megaphone },
  ],
  "HR Manager": [
    { name: 'HR Dashboard', path: '/dashboard/hr', icon: LayoutDashboard },
    { name: 'Employee Directory', path: '/dashboard/directory', icon: Users },
    { name: 'Org Chart', path: '/dashboard/hr/org-chart', icon: GitFork },
    { name: 'Leave Approvals', path: '/dashboard/leave', icon: CalendarDays },
    { name: 'Attendance Control', path: '/dashboard/attendance', icon: CalendarDays },
    { name: 'Payroll Control', path: '/dashboard/payroll', icon: Briefcase },
    { name: 'Performance', path: '/dashboard/hr/performance', icon: FileCheck },
    { name: 'Compliance Control', path: '/dashboard/compliance', icon: ShieldAlert },
    { name: 'Bulletins & Surveys', path: '/dashboard/announcements', icon: Megaphone },
  ],
  "Manager": [
    { name: 'Team Dashboard', path: '/dashboard/manager', icon: LayoutDashboard },
    { name: 'My Team', path: '/dashboard/directory', icon: Users },
    { name: 'Leave Approvals', path: '/dashboard/leave', icon: CalendarDays },
    { name: 'Team Attendance', path: '/dashboard/attendance', icon: CalendarDays },
    { name: 'Team Performance', path: '/dashboard/manager/performance', icon: FileCheck },
    { name: 'Compliance Rules', path: '/dashboard/compliance', icon: ShieldAlert },
    { name: 'Bulletins & Surveys', path: '/dashboard/announcements', icon: Megaphone },
  ],
  "Employee": [
    { name: 'My Dashboard', path: '/dashboard/employee', icon: LayoutDashboard },
    { name: 'My Profile', path: '/dashboard/directory', icon: UserCircle },
    { name: 'My Leaves', path: '/dashboard/leave', icon: CalendarDays },
    { name: 'Clock In/Out', path: '/dashboard/attendance', icon: CalendarDays },
    { name: 'My Payslips', path: '/dashboard/payroll', icon: Briefcase },
    { name: 'Compliance & Policies', path: '/dashboard/compliance', icon: ShieldAlert },
    { name: 'Bulletins & Surveys', path: '/dashboard/announcements', icon: Megaphone },
  ]
};

export default function Sidebar({ userRole = "Employee" }) {
  const pathname = usePathname();
  const menuItems = ROLE_MENUS[userRole] || ROLE_MENUS["Employee"];

  return (
    <aside style={{
      width: '260px',
      background: '#1a1a1a',
      color: '#F2EDE6',
      padding: '2rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #333'
    }}>
      <div className="auth-logo" style={{ color: '#F2EDE6', fontSize: '1.75rem', marginBottom: '2.5rem', paddingLeft: '0.75rem' }}>
        <span style={{ color: 'var(--accent-purple)' }}>a</span>ntbox
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <div style={{ 
          padding: '0 0.75rem 0.5rem', 
          color: '#888', 
          fontSize: '0.75rem', 
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600
        }}>
          {userRole} Menu
        </div>
        
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '8px',
                color: isActive ? '#fff' : '#a1a1aa',
                backgroundColor: isActive ? 'rgba(123, 94, 167, 0.2)' : 'transparent',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? 500 : 400,
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={20} color={isActive ? 'var(--accent-purple)' : 'currentColor'} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
        <button 
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/';
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            width: '100%',
            background: 'none',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            textAlign: 'left',
            borderRadius: '8px',
            transition: 'background 0.2s ease',
            fontSize: '0.9375rem'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
