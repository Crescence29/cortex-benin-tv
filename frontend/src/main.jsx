import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { getInitialTheme, applyTheme } from './theme.js';
import './index.css';
import App from './App.jsx';

// Applique le thème sauvegardé avant le premier rendu, sur TOUTES les pages
// (site public ET dashboard admin) — évite un thème incohérent au chargement.
applyTheme(getInitialTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
);
