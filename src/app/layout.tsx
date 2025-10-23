import './globals.css';
import RegisterSW from './registerSW';
import Header from './components/Header';
import { SessionProvider } from 'next-auth/react';
import AuthProvider from './components/AuthProvider';

export const metadata = {
  title: 'Unilink',
  description: 'Unilink — application web progressive',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#1e90ff" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/unilink.png" />
      </head>
      <body>
        <AuthProvider>
          {/* Client component below will register the SW (only on client) */}
          <RegisterSW />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}