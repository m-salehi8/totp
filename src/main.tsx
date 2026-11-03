import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge any stale service worker caches from previous versions
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
