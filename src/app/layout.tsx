import './globals.css';
import RegisterSW from './registerSW';
//import RegisterSW from './registerSW.tsx';

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
        {/* Client component below will register the SW (only on client) */}
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}