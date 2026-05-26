"use client";

import { useEffect, useState, useRef } from 'react';
import { Bell, Search, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Topbar({ userName, userRole }) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAllRead() {
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, textTransform: 'capitalize' }}>
          {displayTitle}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Search Bar - Global for HR/IT, Scoped for others */}
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input 
            type="text" 
            placeholder={['IT Owner', 'HR Manager'].includes(userRole) ? "Search company-wide..." : "Search..."}
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
                {unreadCount > 0 && (
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
                        onClick={() => !n.read && markSingleRead(n.id)}
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
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>{userRole}</div>
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'var(--accent-purple)', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.125rem'
          }}>
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
