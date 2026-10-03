import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Kendala Memuat Halaman toko-online.online">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register PWA Service Worker (Firefox-compliant, safe against private browsing & auto updates)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Immediately update service worker to flush any corrupted caches in Firefox
          reg.update().catch(() => {});
          console.log('[SW] Service worker registered successfully');
        })
        .catch((err) => {
          console.log('[SW] Registration note (normal in strict private browsing):', err);
        });
    } catch (err) {
      console.warn('[SW] Service worker init note:', err);
    }
  });
}
