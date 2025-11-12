import './globals.css';
import RegisterSW from './registerSW';
import dynamic from 'next/dynamic';
import OfflineIndicator from './components/OfflineIndicator';
import AuthProvider from './components/AuthProvider';

export const metadata = {
  title: 'Unilink',
  description: 'Unilink — application web progressive',
};

// Render Header only on the client to avoid any hydration mismatch
const Header = dynamic(() => import('./components/Header'), { ssr: false });

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#1e90ff" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/unilink.png" />
        {process.env.NODE_ENV !== 'production' && (
          // Early, pre-hydration cleanup to avoid stale SW/runtime chunks causing "reading 'call'" errors
          <script
            dangerouslySetInnerHTML={{
              __html: `
              (function(){
                try {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs){
                      regs.forEach(function(r){ try{ r.unregister(); }catch(e){} });
                    }).catch(function(){});
                  }
                  if (globalThis.caches && globalThis.caches.keys) {
                    globalThis.caches.keys().then(function(keys){
                      keys.forEach(function(k){ try{ globalThis.caches.delete(k); }catch(e){} });
                    }).catch(function(){});
                  }
                  // Catch early webpack runtime errors and hard-reload after cleanup
                  globalThis.addEventListener('error', function(ev){
                    try {
                      var msg = (ev && ev.message) || '';
                      if (typeof msg === 'string' && (msg.indexOf("Loading chunk")>=0 || msg.indexOf("ChunkLoadError")>=0 || msg.indexOf("/_next/undefined")>=0 || msg.indexOf("reading 'call'")>=0)) {
                        setTimeout(function(){ try{ (globalThis.location).reload(true); }catch(e){ globalThis.location.reload(); } }, 200);
                      }
                    } catch(e){}
                  }, { once: true });
                } catch(e){}
              })();
            `}}
          />
        )}
      </head>
      <body>
        <AuthProvider>
          {/* Client component below will register the SW (only on client) */}
          <RegisterSW />
          <OfflineIndicator />
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