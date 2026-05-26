"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Building2,
  CalendarDays, 
  Briefcase, 
  Megaphone, 
  UserCircle,
  LogOut,
  ScrollText,
  Clock,
  Database,
  UserCog,
  Lock,
  ShieldAlert
} from 'lucide-react';

const ROLE_MENUS = {
  "Admin": [
    { name: 'Dashboard', path: '/dashboard/it-owner', icon: LayoutDashboard, exact: true },
    {
      category: 'ACCESS MANAGEMENT',
      items: [
        { name: 'HR Manager Accounts', path: '/dashboard/it-owner/access', icon: UserCog },
        { name: 'Roles & Permissions', path: '/dashboard/it-owner/access/roles', icon: Lock },
      ]
    },
    {
      category: 'ORGANISATION SETUP',
      items: [
        { name: 'Company Profile', path: '/dashboard/it-owner/setup', icon: Building2, exact: true },
        { name: 'Departments', path: '/dashboard/it-owner/setup/departments', icon: Users },
        { name: 'Holiday Calendar', path: '/dashboard/it-owner/setup/holidays', icon: CalendarDays },
        { name: 'Working Hours', path: '/dashboard/it-owner/setup/hours', icon: Clock },
      ]
    },
    {
      category: 'PAYROLL',
      items: [
        { name: 'Payroll Gate', path: '/dashboard/it-owner/payroll-gate', icon: Briefcase },
      ]
    },
    {
      category: 'AUDIT & SECURITY',
      items: [
        { name: 'Audit Log', path: '/dashboard/it-owner/audit', icon: ScrollText, exact: true },
        { name: 'Data Export', path: '/dashboard/it-owner/audit/export', icon: Database },
      ]
    }
  ],
  "HR Manager": [
    { name: 'Dashboard',     path: '/dashboard/hr',            icon: LayoutDashboard },
    { name: 'Employees',     path: '/dashboard/directory',     icon: Users },
    { name: 'Leave',         path: '/dashboard/leave',         icon: CalendarDays },
    { name: 'Attendance',    path: '/dashboard/attendance',    icon: Clock },
    { name: 'Payroll',       path: '/dashboard/payroll',       icon: Briefcase },
    { name: 'Compliance',    path: '/dashboard/compliance',    icon: ShieldAlert },
    { name: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
  ],
  "Employee": [
    { name: 'Dashboard',     path: '/dashboard/employee',      icon: LayoutDashboard },
    { name: 'My Leaves',     path: '/dashboard/leave',         icon: CalendarDays },
    { name: 'My Attendance', path: '/dashboard/attendance',    icon: Clock },
    { name: 'My Payslips',   path: '/dashboard/payroll',       icon: Briefcase },
    { name: 'My Profile',    path: '/dashboard/directory/me',  icon: UserCircle }
  ]
};

export default function Sidebar({ userRole = "Employee", userName = "User" }) {
  const pathname = usePathname();
  const menuItems = ROLE_MENUS[userRole] || ROLE_MENUS["Employee"];
  const displayName = userRole === 'Admin' ? 'Admin' : userName;

  // Helper to check if current route matches path (supports exact flag)
  const isRouteActive = (item) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  // Helper to render a menu link item
  const renderItem = (item) => {
    const active = isRouteActive(item);
    const Icon = item.icon;

    return (
      <Link 
        key={item.path} 
        href={item.path}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 0.75rem',
          borderRadius: '8px',
          color: active ? '#7B5EA7' : '#4b5563',
          backgroundColor: active ? '#EBE6F9' : 'transparent',
          transition: 'all 0.2s ease',
          fontWeight: active ? 600 : 500,
          fontSize: '0.875rem',
          textDecoration: 'none',
          marginBottom: '0.125rem'
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Icon size={18} color={active ? '#7B5EA7' : '#9ca3af'} style={{ flexShrink: 0 }} />
        <span>{item.name}</span>
      </Link>
    );
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside style={{
      width: '260px',
      background: '#ffffff',
      color: '#1f2937',
      padding: '1.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #f0ece6',
      flexShrink: 0,
      height: '100vh',
      boxSizing: 'border-box'
    }}>
      {/* Brand Logo Header (Matching Login Page Theme) */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: '2rem',
        width: '100%',
        paddingLeft: '0.25rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          borderRadius: '9999px',
          overflow: 'hidden',
          border: '1px solid rgba(123, 94, 167, 0.15)',
          width: '100%',
          maxWidth: '220px'
        }}>
          {/* Left Side: antbox */}
          <div style={{
            background: '#ffffff',
            padding: '0.5rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1.1
          }}>
            <span style={{
              color: '#7B5EA7',
              fontSize: '1.25rem',
              fontWeight: '700',
              letterSpacing: '0.05em',
              fontFamily: "'Caveat', cursive"
            }}>
              antbox
            </span>
          </div>
          {/* Right Side: hive */}
          <div style={{
            background: '#7B5EA7',
            padding: '0.5rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 0.9,
            borderLeft: '1px solid rgba(123, 94, 167, 0.1)'
          }}>
            <span style={{
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: '700',
              letterSpacing: '0.05em',
              fontFamily: "'Caveat', cursive"
            }}>
              hive
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
        {menuItems.map((menuNode, idx) => {
          // If node has items, it's a category section
          if (menuNode.category) {
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ 
                  padding: '0.5rem 0.75rem 0.25rem', 
                  color: '#9ca3af', 
                  fontSize: '0.6875rem', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600
                }}>
                  {menuNode.category}
                </div>
                {menuNode.items.map(item => renderItem(item))}
              </div>
            );
          }
          // Otherwise, it's a top-level link (like Dashboard)
          return renderItem(menuNode);
        })}
      </nav>

      {/* User Info & Logout Block at Bottom */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #f0ece6', paddingTop: '1rem' }}>
        <div 
          onClick={async () => {
            if (confirm('Are you sure you want to sign out?')) {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/';
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            background: '#faf9f8',
            border: '1px solid #f0ece6'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#faf9f8'}
          title="Click to Sign Out"
        >
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            background: '#EBE6F9', 
            color: '#7B5EA7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.875rem'
          }}>
            {getInitials(displayName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '0.8125rem', 
              fontWeight: 700, 
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {displayName}
            </div>
            <div style={{ 
              fontSize: '0.6875rem', 
              color: '#6b7280',
              fontWeight: 500
            }}>
              {userRole === 'Admin' ? 'Admin' : userRole === 'HR Manager' ? 'HR Manager' : userRole}
            </div>
          </div>
          <LogOut size={16} color="#dc2626" style={{ flexShrink: 0, opacity: 0.7 }} />
        </div>
      </div>
    </aside>
  );
}
