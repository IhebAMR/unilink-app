import React from 'react';
import InstallButton from './InstallButton';

export default function Header() {
  return (
    <header className="header app-container" role="banner" aria-label="En-tête de l'application">
      <div className="logo" aria-hidden>
        {/* small SVG or text logo */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#1e90ff" />
          <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#fff" fontFamily="Inter, Arial">U</text>
        </svg>
        <span className="logo-text">Unilink</span>
      </div>

      <nav aria-label="Navigation principale">
        <InstallButton />
      </nav>
    </header>
  );
}