// Appelle ceci uniquement côté client (useEffect dans _app ou composant root).
export function registerServiceWorker() {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      // Register only in production
      if (process.env.NODE_ENV !== 'production') {
        return;
      }
      window.addEventListener('load', () => {
        const swUrl = '/serviceworker.js';
        navigator.serviceWorker.register(swUrl).then(registration => {
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
        }).catch(err => {
          console.error('Erreur d\'enregistrement du Service Worker:', err);
        });
      });
    }
  }