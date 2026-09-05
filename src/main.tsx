import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from './components/auth/AuthGate';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Together Events service worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
    <PwaInstallPrompt />
  </StrictMode>
);
