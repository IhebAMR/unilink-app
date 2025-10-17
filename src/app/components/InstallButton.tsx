'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function beforeInstallPrompt(e: Event) {
      e.preventDefault();
      // Keep the event for later user action
      setDeferredPrompt(e);
      setVisible(true);
    }

    function onAppInstalled() {
      setDeferredPrompt(null);
      setVisible(false);
      console.log('PWA installed');
    }

    window.addEventListener('beforeinstallprompt', beforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // @ts-ignore call prompt dynamically
    (deferredPrompt as any).prompt();
    const choice = await (deferredPrompt as any).userChoice;
    if (choice && choice.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  // You can still show a disabled hint if not available
  if (!visible) return null;

  return (
    <button
      onClick={handleInstall}
      className="btn primary"
      aria-label="Installer l'application Unilink"
      title="Installer l'application"
    >
      Installer
    </button>
  );
}