import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);

// El SDK de PayPal (cargado globalmente en App) lanza errores cross-origin de "postrobot"
// que el overlay de desarrollo muestra como "Script error." aunque la app funcione bien.
// Se ignoran SOLO ese ruido, en desarrollo; el resto de errores reales se siguen mostrando.
if (process.env.NODE_ENV === 'development') {
  const isPayPalNoise = (msg: unknown, filename?: string) => {
    const text = String(msg || '');
    return (
      text === 'Script error.' ||
      text.includes('postrobot') ||
      text.includes('post message') ||
      (filename || '').includes('paypal.com')
    );
  };
  window.addEventListener(
    'error',
    (event) => {
      if (isPayPalNoise(event.message, event.filename)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason: any = event.reason;
      if (isPayPalNoise(reason?.message || reason)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

// Desregistrar Service Workers existentes para evitar problemas de caché y errores de "Failed to fetch"
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((boolean) => {
        if (boolean) console.log('Service Worker desregistrado correctamente');
      });
    }
  }).catch(error => {
    console.error('Error al desregistrar Service Workers:', error);
  });
}

