import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';
import { registerServiceWorker } from '../lib/registerServiceWorker';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Enregistrer le SW en production uniquement
    registerServiceWorker();

    // exemple : afficher prompt quand SW signale une mise à jour
    const onSWUpdated = () => {
      // tu peux remplacer par UI (Snackbar / modal)
      if (confirm('Nouvelle version disponible. Actualiser maintenant ?')) {
        window.location.reload();
      }
    };
    window.addEventListener('swUpdated', onSWUpdated);
    return () => window.removeEventListener('swUpdated', onSWUpdated);
  }, []);

  return (
    <>
      <Head>
        <meta name="theme-color" content="#1e90ff" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/unilink.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}