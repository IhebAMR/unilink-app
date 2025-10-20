'use client';

import React, { useState, useEffect } from 'react';
import InstallButton from './InstallButton';

interface User {
  name: string;
  email: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="header app-container" role="banner" aria-label="En-tête de l'application">
      <div className="logo" aria-hidden>
        <a href="/" className="logo-link">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="2" y="2" width="20" height="20" rx="5" fill="#1e90ff" />
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#fff" fontFamily="Inter, Arial">U</text>
          </svg>
          <span className="logo-text">Unilink</span>
        </a>
      </div>

      <nav className="main-nav" aria-label="Navigation principale">
        <a href="/explore" className="nav-link">Découvrir</a>
        <a href="/docs" className="nav-link">Documentation</a>
      </nav>

      <div className="nav-actions">
        {user ? (
          <div className="user-menu">
            <div className="user-info">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.name}</span>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Se déconnecter
            </button>
          </div>
        ) : (
          <a href="/login" className="login-button">Se connecter</a>
        )}
        <InstallButton />
      </div>
    </header>
  );
}
