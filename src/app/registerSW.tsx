'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In production we register. For easier local testing, allow localhost too.
    const shouldRegister =
      process.env.NODE_ENV === 'production' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!shouldRegister) return;

    const swUrl = '/sw.js';
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update();
          }, 60000);

          console.log('Service Worker registered:', registration);

          registration.onupdatefound = () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.onstatechange = () => {
              if (installing.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New version available - skip waiting to activate immediately
                  console.log('New service worker version available!');
                  installing.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                } else {
                  console.log('Content cached for offline use.');
                }
              }
            };
          };
        })
        .catch((err) => console.error('SW registration error:', err));
    });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker updated, reloading page...');
      window.location.reload();
    });
  }, []);

  return null;
}