'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InstallButton from './InstallButton';

interface User {
  _id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showCarpoolDropdown, setShowCarpoolDropdown] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Try server-side cookie-based auth first
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (mounted && json?.user) {
            setUser(json.user);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // ignore and fallback to localStorage
      }

      // Fallback: try localStorage (keeps your previous behavior)
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          if (mounted) setUser(userData);
        }
      } catch (e) {
        console.error('Error reading user from localStorage:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Fetch notifications when user is logged in
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setNotificationCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationIds: [notificationId] })
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markAllRead: true })
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleLogout = async () => {
    try {
      // call logout endpoint to clear the HttpOnly cookie
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      // clear local client state
      localStorage.removeItem('user');
      setUser(null);
      router.push('/'); // redirect home
    }
  };

  return (
    <header className="header app-container" role="banner" aria-label="En-tête de l'application">
      <div className="logo" aria-hidden>
        <Link href="/" className="logo-link">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="2" y="2" width="20" height="20" rx="5" fill="#1e90ff" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#fff" fontFamily="Inter, Arial">U</text>
          </svg>
          <span className="logo-text">Unilink</span>
        </Link>
      </div>

      <nav className="main-nav" aria-label="Navigation principale">
        {/* Carpooling Dropdown */}
        <div 
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowCarpoolDropdown(true)}
          onMouseLeave={() => setShowCarpoolDropdown(false)}
        >
          <button className="nav-link nav-link-primary" style={{ border: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <path d="M5 17h14v-4l-1.5-4.5h-11L5 13v4z"/>
              <circle cx="7" cy="17" r="2"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
            Carpooling
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4, verticalAlign: 'middle' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          
          {showCarpoolDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: 220,
              marginTop: 8,
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <Link href="/carpools" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  color: '#333'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  <span style={{ fontWeight: 500 }}>Browse Rides</span>
                </div>
              </Link>
              
              <Link href="/carpools/create" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  color: '#333'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span style={{ fontWeight: 500 }}>Offer a Ride</span>
                </div>
              </Link>
              
              <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}></div>
              
              <Link href="/ride-demands" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  color: '#333'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span style={{ fontWeight: 500 }}>Ride Requests</span>
                </div>
              </Link>
              
              <Link href="/ride-demands/create" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  color: '#333'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span style={{ fontWeight: 500 }}>Request a Ride</span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="nav-actions">
        {loading ? (
          <div className="nav-loading" aria-hidden>...</div>
        ) : user ? (
          <div className="user-menu">
            {/* Notification Bell */}
            <div style={{ position: 'relative', marginRight: 16 }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 8
                }}
                title="Notifications"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notificationCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    backgroundColor: '#f44336',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  width: 350,
                  maxHeight: 400,
                  overflowY: 'auto',
                  zIndex: 1000,
                  marginTop: 8
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <strong>Notifications</strong>
                    {notificationCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1e90ff',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif._id}
                        onClick={() => {
                          if (!notif.read) handleMarkAsRead(notif._id);
                          if (notif.relatedRide) {
                            router.push(`/carpools/${notif.relatedRide}`);
                            setShowNotifications(false);
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          backgroundColor: notif.read ? 'white' : '#f0f8ff',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f4fd'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.read ? 'white' : '#f0f8ff'}
                      >
                        <div style={{ fontWeight: notif.read ? 'normal' : 'bold', marginBottom: 4 }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
                          {new Date(notif.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="user-info" title={user.email}>
              <div className="user-avatar" aria-hidden>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="user-name">{user.name}</span>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Se déconnecter
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/login"><button className="login-button">Se connecter</button></Link>
          </div>
        )}
        <InstallButton />
      </div>
    </header>
  );
}