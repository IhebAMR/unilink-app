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
          // logged so you can see it in the browser console
          console.log('Service Worker enregistré:', registration);

          registration.onupdatefound = () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.onstatechange = () => {
              if (installing.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // nouvelle version disponible
                  window.dispatchEvent(new Event('swUpdated'));
                } else {
                  console.log('Contenu mis en cache pour utilisation hors-ligne.');
                }
              }
            };
          };
        })
        .catch((err) => console.error('Erreur d\'enregistrement du SW:', err));
    });
  }, []);

  return null;
}