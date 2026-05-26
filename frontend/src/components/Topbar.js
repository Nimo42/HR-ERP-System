"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell, Search, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Topbar({ userName, userRole }) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mustAcceptInvitation, setMustAcceptInvitation] = useState(false);
  const panelRef = useRef(null);
  const profileRef = useRef(null);
  const displayUserName = userRole === 'Admin' ? 'Admin' : userName;

  // Basic breadcrumb generation based on path
  const pathParts = pathname.split('/').filter(Boolean);
  const pageName = pathParts[pathParts.length - 1]?.replace(/-/g, ' ') || 'Dashboard';
  const displayTitle = pageName.charAt(0).toUpperCase() + pageName.slice(1);

  // Load notifications
  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const list = data.notifications || [];
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.read).length);
        setMustAcceptInvitation(list.some((n) => n.type === 'invitation' && !n.read));
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadNotifications();
    
    // Poll notifications every 30 seconds for live updates
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel on clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAllRead() {
    if (mustAcceptInvitation) return;
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true })
    });
    loadNotifications();
  }

  async function markSingleRead(id) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    loadNotifications();
  }

  async function handleInvitationAction(id, action) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    });
    if (action === 'decline') {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
      return;
    }
    loadNotifications();
  }

  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '2rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid #f0f0f0',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {userRole !== 'Admin' && (
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, textTransform: 'capitalize' }}>
            {displayTitle}
          </h2>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Search Bar - Global for HR/IT, Scoped for others */}
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input 
            type="text" 
            placeholder={['Admin', 'HR Manager'].includes(userRole) ? "Search company-wide..." : "Search..."}
            style={{
              width: '100%',
              padding: '0.5rem 1rem 0.5rem 2.5rem',
              borderRadius: '9999px',
              border: '1px solid #e5e5e5',
              background: '#f9f9f9',
              outline: 'none',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Notifications Button */}
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.25rem' }}
          >
            <Bell size={20} color="#4a4a4a" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '0',
                right: '0',
                width: '16px',
                height: '16px',
                background: '#dc2626',
                borderRadius: '50%',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>{unreadCount}</span>
            )}
          </button>

          {/* Floating Notification Panel */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '320px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              zIndex: 9999,
              marginTop: '0.5rem',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                {unreadCount > 0 && !mustAcceptInvitation && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#7B5EA7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Mark all read
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.8125rem' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => {
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => !n.read && n.type !== 'invitation' && markSingleRead(n.id)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          background: n.read ? '#fff' : '#f5f3ff',
                          border: '1px solid',
                          borderColor: n.read ? '#f3f4f6' : '#ddd6fe',
                          cursor: n.read ? 'default' : 'pointer',
                          display: 'flex',
                          gap: '0.5rem',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ marginTop: '0.125rem' }}>
                          {n.type === 'leave' ? <CheckCircle2 size={14} color="#10b981" />
                            : n.type === 'attendance' ? <AlertTriangle size={14} color="#f59e0b" />
                            : <MessageSquare size={14} color="#7c3aed" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.8125rem', color: '#1f2937' }}>{n.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.25rem' }}>{new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          {n.type === 'invitation' && !n.read && (
                            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleInvitationAction(n.id, 'accept'); }}
                                style={{ border: '1px solid #10b981', color: '#047857', background: '#ecfdf5', borderRadius: '6px', padding: '0.2rem 0.45rem', fontSize: '0.6875rem', cursor: 'pointer' }}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleInvitationAction(n.id, 'decline'); }}
                                style={{ border: '1px solid #ef4444', color: '#b91c1c', background: '#fef2f2', borderRadius: '6px', padding: '0.2rem 0.45rem', fontSize: '0.6875rem', cursor: 'pointer' }}
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar Dropdown */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '8px', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{displayUserName}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{userRole === 'Admin' ? 'Admin' : userRole}</div>
            </div>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: '#7B5EA7', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.125rem'
            }}>
              {displayUserName ? displayUserName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '180px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              zIndex: 9999,
              marginTop: '0.5rem',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <a href={userRole === 'Admin' ? '/dashboard/it-owner/setup' : '#'} style={{ display: 'block', padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#374151', textDecoration: 'none', borderRadius: '8px', transition: 'background 0.2s', fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Profile
              </a>
              <a href={userRole === 'Admin' ? '/dashboard/it-owner/setup' : '#'} style={{ display: 'block', padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#374151', textDecoration: 'none', borderRadius: '8px', transition: 'background 0.2s', fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Settings
              </a>
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.25rem 0' }} />
              <button onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/';
              }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.625rem 1rem', fontSize: '0.875rem', color: '#dc2626', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
      {mustAcceptInvitation && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17, 24, 39, 0.55)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            background: '#fff',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            padding: '1.2rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Account Activation Required</h3>
            <p style={{ marginTop: '0.5rem', marginBottom: '0.9rem', color: '#4b5563', fontSize: '0.875rem' }}>
              Accept your invitation notification to continue using Antbox Hive.
            </p>
            {notifications.filter((n) => n.type === 'invitation' && !n.read).map((n) => (
              <div key={n.id} style={{ border: '1px solid #ddd6fe', background: '#f5f3ff', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.875rem' }}>{n.title}</div>
                <div style={{ color: '#6b7280', fontSize: '0.8125rem', marginTop: '0.2rem' }}>{n.content}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.7rem' }}>
                  <button type="button" onClick={() => handleInvitationAction(n.id, 'accept')} style={{ border: '1px solid #10b981', color: '#047857', background: '#ecfdf5', borderRadius: '8px', padding: '0.35rem 0.7rem', fontSize: '0.75rem', cursor: 'pointer' }}>Accept</button>
                  <button type="button" onClick={() => handleInvitationAction(n.id, 'decline')} style={{ border: '1px solid #ef4444', color: '#b91c1c', background: '#fef2f2', borderRadius: '8px', padding: '0.35rem 0.7rem', fontSize: '0.75rem', cursor: 'pointer' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
