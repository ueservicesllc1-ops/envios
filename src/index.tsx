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

