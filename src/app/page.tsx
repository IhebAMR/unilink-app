import React from 'react';
import './globals.css';
import Header from './components/Header';

export default function Page() {
  return (
    <div className="page-root">
      <Header />
      <main className="main">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">Unilink — Connecte, Partage, Travaille</h1>
            <p className="hero-subtitle">
              Une application rapide et installable, pensée mobile-first pour partager des contenus et rester productif même hors‑ligne.
            </p>

            <div className="hero-ctas">
              <a className="btn primary" href="/explore">Découvrir</a>
              <a className="btn outline" href="/docs">Documentation</a>
            </div>

            <ul className="hero-features" aria-hidden>
              <li>Installable (PWA)</li>
              <li>Mode hors‑ligne basique</li>
              <li>Interface responsive</li>
            </ul>
          </div>

          <figure className="hero-figure" aria-hidden>
            {/* Use next/image if you add an image in public/images/ */}
            <img className="hero-image" src="/icons/unilink.png" alt="" />
          </figure>
        </section>

        <section className="features" aria-labelledby="features-title">
          <h2 id="features-title" className="section-title">Pourquoi Unilink ?</h2>

          <div className="card-grid">
            <article className="card">
              <h3>Rapide & Léger</h3>
              <p>Optimisé pour mobile, le contenu se charge vite et l’UI reste fluide même sur réseau lent.</p>
            </article>

            <article className="card">
              <h3>Offline friendly</h3>
              <p>Les pages essentielles peuvent être servies depuis le cache quand le réseau est perdu.</p>
            </article>

            <article className="card">
              <h3>Installable</h3>
              <p>Ajoute l’application à ton écran d’accueil pour un accès rapide, comme une app native.</p>
            </article>

            <article className="card">
              <h3>Accessible</h3>
              <p>Focus visible, zones tactiles suffisantes et sémantique respectée pour une meilleure UX.</p>
            </article>
          </div>
        </section>

        <section className="cta" aria-labelledby="cta-title">
          <h2 id="cta-title" className="section-title">Prêt à essayer ?</h2>
          <p className="muted">Installe Unilink ou explore les exemples pour commencer.</p>
          <div style={{ marginTop: 12 }}>
            <a className="btn primary large" href="/start">Commencer</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          &copy; {new Date().getFullYear()} Unilink — Tous droits réservés
        </div>
      </footer>
    </div>
  );
}