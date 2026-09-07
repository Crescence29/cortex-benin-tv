import { createContext, useContext, useEffect, useState } from 'react';
import translations from './translations';

const LanguageContext = createContext(null);

function getInitialLang() {
  return localStorage.getItem('cortex_lang') || 'fr';
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    localStorage.setItem('cortex_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
  }, [lang]);

  function t(key) {
    return translations[lang]?.[key] ?? translations.fr[key] ?? key;
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
