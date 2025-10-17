import React from 'react';
import '../../styles/globals.css';

type Props = {
  title?: string;
  children?: React.ReactNode;
};

export const MobileFirstLayout: React.FC<Props> = ({ title = 'Unilink', children }) => {
  return (
    <div className="app-container" role="application">
      <header className="header" aria-label="En-tête de l'application">
        <div className="logo">{title}</div>
        <nav aria-label="Navigation">
          <button aria-label="Menu">☰</button>
        </nav>
      </header>

      <main>
        <section className="card-list" aria-live="polite">
          {children}
        </section>
      </main>

      <footer className="footer">
        &copy; {new Date().getFullYear()} Unilink
      </footer>
    </div>
  );
};

export default MobileFirstLayout;