'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // In development, ensure any previously-registered service workers are unregistered
    // This prevents a stale SW (from previous runs) from intercepting /_next/ requests
    // and serving or redirecting to invalid chunk URLs such as '/_next/undefined'.
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      // Best-effort cleanup for dev: unregister any service workers and clear runtime caches
      navigator.serviceWorker.getRegistrations()
        .then(regs => { for (const r of regs) { try { r.unregister(); } catch {} } })
        .catch(() => {});
      if (globalThis.caches && globalThis.caches.keys) {
        globalThis.caches.keys().then(keys => { for (const k of keys) { try { globalThis.caches.delete(k); } catch {} } }).catch(() => {});
      }

      // Install a global error handler to detect chunk load errors and attempt to recover
      const onError = (ev: ErrorEvent) => {
        try {
          const msg = ev?.message || '';
          if (
            typeof msg === 'string' && (
              msg.includes('Loading chunk') ||
              msg.includes('ChunkLoadError') ||
              msg.includes('/_next/undefined') ||
              msg.includes("Cannot read properties of undefined (reading 'call')")
            )
          ) {
            // unregister and clear caches then reload to recover from stale SW or stale assets
            navigator.serviceWorker.getRegistrations().then(regs => { for (const r of regs) { try { r.unregister(); } catch {} } }).catch(() => {});
            if (globalThis.caches && globalThis.caches.keys) {
              globalThis.caches.keys().then(keys => { for (const k of keys) { try { globalThis.caches.delete(k); } catch {} } }).catch(() => {});
            }
            // small delay to allow unregister to propagate
            setTimeout(() => { try { (globalThis.location as any).reload(true); } catch { globalThis.location.reload(); } }, 300);
          }
        } catch (e) {
          // swallow
        }
      };
      window.addEventListener('error', onError);

      return () => { window.removeEventListener('error', onError); };
    }

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