'use client';
import { useState, useEffect, useRef } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Function to check actual network connectivity
    const checkRealOnlineStatus = async (): Promise<boolean> => {
      // First check navigator.onLine
      if (!navigator.onLine) {
        return false;
      }

      // Then verify with actual network request
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/api/auth/session', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Consider online if we get any response (even 404 or 401)
        return true;
      } catch {
        // Network error - we're offline
        return false;
      }
    };

    const updateStatus = async () => {
      const online = await checkRealOnlineStatus();
      setIsOnline(online);
    };

    // Initial check
    updateStatus();

    // Set up periodic checks every 10 seconds
    const intervalId = setInterval(updateStatus, 10000);

    // Listen to browser online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Verify immediately
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen to visibilitychange to check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isOnline;
}
