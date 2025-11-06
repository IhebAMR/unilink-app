'use client';
import React, { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/app/lib/useOnlineStatus';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Going offline
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // Coming back online
      setShowBanner(true);
      // Hide the "back online" message after 3 seconds
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (!wasOffline) {
      // Initial online state - don't show banner
      setShowBanner(false);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        backgroundColor: isOnline ? '#4CAF50' : '#ff9800',
        color: 'white',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      {isOnline ? (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Back Online
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39m3.66 0a11.07 11.07 0 0 1 3.83.98M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88m2.41-.53" />
          </svg>
          You are offline - Viewing cached data
        </>
      )}
    </div>
  );
}
