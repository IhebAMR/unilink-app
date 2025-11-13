'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import InstallButton from './InstallButton';

interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  image?: string;
  role?: string;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showCarpoolDropdown, setShowCarpoolDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; bottom: number; left: number } | null>(null);
  // refs must be defined unconditionally (no early returns before hooks)
  const carpoolRef = useRef<HTMLDivElement>(null);
  const carpoolButtonRef = useRef<HTMLButtonElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  // Hide header on public/auth pages (handled later with a single null-return)
  const publicRoutes = ['/login','/register','/forgot-password','/otp-verification'];
  const isPublicRoute = publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'));
  // Add ai-chat to always show in nav

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (carpoolRef.current && !carpoolRef.current.contains(t)) setShowCarpoolDropdown(false);
      if (notifyRef.current && !notifyRef.current.contains(t)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(t)) setIsProfileOpen(false);
    };
    globalThis.document?.addEventListener('mousedown', onDocClick as any);
    return () => globalThis.document?.removeEventListener('mousedown', onDocClick as any);
  }, []);

  // Track viewport to decide dropdown direction (drop-up on mobile or low space)
  useEffect(() => {
    const updateDevice = () => setIsMobile(window.innerWidth < 768);
    updateDevice();
    globalThis.addEventListener('resize', updateDevice as any);
    return () => globalThis.removeEventListener('resize', updateDevice as any);
  }, []);

  // When menu opens or viewport changes, compute whether to drop up
  useEffect(() => {
    const computeDropDirection = () => {
      if (!showCarpoolDropdown) return;
      const btn = carpoolButtonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      // Force dropdown to open downward (no state needed)
      setMenuCoords({ top: rect.top, bottom: rect.bottom, left: rect.left });
    };

    computeDropDirection();
    globalThis.addEventListener('resize', computeDropDirection as any);
    globalThis.addEventListener('scroll', computeDropDirection as any, true);
    return () => {
      globalThis.removeEventListener('resize', computeDropDirection as any);
      globalThis.removeEventListener('scroll', computeDropDirection as any, true);
    };
  }, [showCarpoolDropdown, isMobile]);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      setLoading(true);
      try {
        // Always use authoritative /api/me
        let serverUser: User | null = null;
        try {
          const res = await fetch(`/api/me?ts=${Date.now()}`, { credentials: 'include', cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json?.user) serverUser = json.user as User;
          }
        } catch (err) {
          console.warn('Failed to fetch /api/me:', err);
        }

        // If server returned a user, prefer it and sync localStorage
        if (mounted && serverUser) {
          setUser(serverUser);
          try { localStorage.setItem('user', JSON.stringify(serverUser)); } catch {}
          return;
        }

        // No user anywhere -> clear stale data
        try { localStorage.removeItem('user'); } catch {}
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();
    // Periodic refresh in case redirects happen without events
    const interval = setInterval(checkAuth, 10000);
    const onStorage = (e: StorageEvent) => { if (e.key === 'user') checkAuth(); };
    const onUserLogin = () => checkAuth();
    // Listen for our custom update event so components can notify header when the user changed
    const onUserUpdated = () => checkAuth();
    globalThis.addEventListener('storage', onStorage as any);
    globalThis.addEventListener('userLogin', onUserLogin as EventListener);
    globalThis.addEventListener('userUpdated', onUserUpdated as EventListener);
    return () => {
      mounted = false;
      clearInterval(interval);
      globalThis.removeEventListener('storage', onStorage as any);
      globalThis.removeEventListener('userLogin', onUserLogin as EventListener);
      globalThis.removeEventListener('userUpdated', onUserUpdated as EventListener);
    };
  }, []);

  // Re-check when route changes (helps right after /login navigates)
  useEffect(() => {
    // Trigger a user refresh when the pathname changes
    const event = new Event('userUpdated');
    globalThis.dispatchEvent(event);
  }, [pathname]);

  // Notifications
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
      } catch (err) { console.error('Failed to fetch notifications', err); }
    };
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ notificationIds: [notificationId] })
      });
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error('Failed to mark notification as read', err); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ markAllRead: true })
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setNotificationCount(0);
    } catch (err) { console.error('Failed to mark all as read', err); }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (err) { console.error('Logout request failed', err); }
    finally {
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    }
  };

  if (isPublicRoute || loading || !user) return null;

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

      <nav className="main-nav flex justify-between gap-4" aria-label="Navigation principale">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/events" className="nav-link nav-link-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Events
          </Link>
          <div ref={carpoolRef} style={{ position: 'relative' }}>
          <Link href="/ai-chat" className="nav-link nav-link-primary" style={{ marginLeft: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10" stroke="#1e90ff" strokeWidth="2" fill="#e3f2fd" />
              <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#1976d2" fontFamily="Inter, Arial">AI</text>
            </svg>
            AI Chat
          </Link>
            <button
              type="button"
              className="nav-link nav-link-primary"
              aria-haspopup="true"
              aria-expanded={showCarpoolDropdown}
              onClick={() => {
                setShowCarpoolDropdown(v => !v);
                // compute drop direction on next paint
                requestAnimationFrame(() => {
                  const btn = carpoolButtonRef.current;
                  if (!btn) return;
                  const rect = btn.getBoundingClientRect();
                  // Always open downward
                  setMenuCoords({ top: rect.top, bottom: rect.bottom, left: rect.left });
                });
              }}
              style={{ border: 'none', cursor: 'pointer' }}
              ref={carpoolButtonRef}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                <path d="M5 17h14v-4l-1.5-4.5h-11L5 13v4z"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
              Carpooling
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 4, verticalAlign: 'middle', transition: 'transform .15s', transform: showCarpoolDropdown ? 'rotate(180deg)' : 'rotate(0)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showCarpoolDropdown && (
              <>
                {/* Backdrop for mobile to capture taps and elevate stacking */}
                {isMobile && (
                  <div
                    onClick={() => setShowCarpoolDropdown(false)}
                    style={{
                      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)', zIndex: 10000
                    }}
                  />
                )}
                <div role="menu" aria-label="Carpooling menu" style={{ 
                  position: isMobile ? 'fixed' : 'absolute', 
                  top: isMobile ? (menuCoords ? menuCoords.bottom + 8 : 56) : 'calc(100% + 8px)',
                  bottom: 'auto',
                  left: isMobile ? 12 : 0, 
                  right: isMobile ? 12 : 'auto',
                  backgroundColor: 'white', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 8, 
                  boxShadow: '0 6px 18px -2px rgba(0,0,0,0.18)', 
                  minWidth: 240, 
                  zIndex: 10001,
                  marginTop: !isMobile ? 4 : 0,
                  marginBottom: 0,
                  maxHeight: isMobile ? '60vh' : 'auto',
                  overflowY: 'auto'
                }}>
                  <Link href="/carpools" className="dropdown-item" role="menuitem" onClick={() => setShowCarpoolDropdown(false)}>Browse Rides</Link>
                  <Link href="/carpools/create" className="dropdown-item" role="menuitem" onClick={() => setShowCarpoolDropdown(false)}>Offer a Ride</Link>
                  <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
                  <Link href="/ride-demands" className="dropdown-item" role="menuitem" onClick={() => setShowCarpoolDropdown(false)}>Ride Requests</Link>
                  <Link href="/ride-demands/create" className="dropdown-item" role="menuitem" onClick={() => setShowCarpoolDropdown(false)}>Request a Ride</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="nav-actions">
          <>
            {/* Notifications */}
            <div ref={notifyRef} style={{ position: 'relative', marginRight: 16 }}>
              <button
                onClick={() => setShowNotifications(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: 8 }}
                title="Notifications"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {notificationCount > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#f44336', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div style={{ 
                  position: 'absolute', 
                  top: 'calc(100% + 8px)', 
                  right: 0, 
                  backgroundColor: 'white', 
                  border: '1px solid #ddd', 
                  borderRadius: 8, 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                  width: 350, 
                  maxHeight: 400, 
                  overflowY: 'auto', 
                  zIndex: 9999 
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Notifications</strong>
                    {notificationCount > 0 && (
                      <button onClick={handleMarkAllAsRead} style={{ background: 'none', border: 'none', color: '#1e90ff', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>No notifications</div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => {
                          if (!notif.read) handleMarkAsRead(notif._id);
                          if (notif.relatedRide) { 
                            router.push(`/carpools/${notif.relatedRide}`); 
                            setShowNotifications(false); 
                          } else if (notif.relatedEvent) {
                            router.push(`/events?eventId=${notif.relatedEvent}`);
                            setShowNotifications(false);
                          }
                        }}
                        style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', backgroundColor: notif.read ? 'white' : '#f0f8ff', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e8f4fd')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = notif.read ? 'white' : '#f0f8ff')}
                      >
                        <div style={{ fontWeight: notif.read ? 'normal' : 'bold', marginBottom: 4 }}>{notif.title}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>{notif.message}</div>
                        <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>{new Date(notif.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} className="user-menu">
              <div className="user-info" onClick={() => setIsProfileOpen(v => !v)} title={user?.email} style={{ cursor: 'pointer' }}>
                <div className="user-avatar" aria-hidden style={{ backgroundImage: (user?.image || user?.avatarUrl) ? `url(${user?.image || user?.avatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  {!(user?.image || user?.avatarUrl) && (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
                </div>
                <span className="user-name">{user?.name}</span>
              </div>
              {isProfileOpen && (
                <div className="dropdown-menu">
                  {user?.role === 'admin' && (
                    <a href="/admin/dashboard" className="dropdown-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      Tableau de bord admin
                    </a>
                  )}
                  <a href="/settings" className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </a>
                  <a href="/history" className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Historique
                  </a>
                  <a href="/my-destinations" className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Mes destinations
                  </a>
                  <a href="/profile" className="dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                  </a>
                  <button onClick={handleLogout} className="dropdown-item text-red-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </>
        <InstallButton />
      </div>
    </header>
  );
}
