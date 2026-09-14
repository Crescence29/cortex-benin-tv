import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { getInitialTheme, applyTheme } from './theme.js';
import './index.css';
import App from './App.jsx';
import { api } from './api.js';

// Applique le thème sauvegardé avant le premier rendu, sur TOUTES les pages
// (site public ET dashboard admin) — évite un thème incohérent au chargement.
applyTheme(getInitialTheme());

// Remonte au développeur les erreurs JS réellement rencontrées par les
// visiteurs (pas seulement en local) — visible dans le tableau de bord
// développeur, section Logs et surveillance.
window.addEventListener('error', (event) => {
  api.reportClientError({
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error?.stack,
    url: window.location.href,
  });
});
window.addEventListener('unhandledrejection', (event) => {
  api.reportClientError({
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    url: window.location.href,
  });
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
);
