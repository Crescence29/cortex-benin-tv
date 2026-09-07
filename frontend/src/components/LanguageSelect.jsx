import { useEffect, useRef, useState } from 'react';
import { IconChevronDown } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api';

export default function LanguageSelect() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState([{ code: 'fr', native_name: 'Français' }]);
  const ref = useRef(null);

  useEffect(() => {
    api.getLanguages().then(setLanguages).catch(() => {});
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className="lang-picker" ref={ref}>
      <button
        type="button"
        className="lang-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {current.code.split('-')[0].toUpperCase()}
        <IconChevronDown className="lang-picker__chevron" />
      </button>
      {open && (
        <div className="lang-picker__panel">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              className={'lang-picker__item' + (l.code === lang ? ' is-selected' : '')}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
            >
              {l.native_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
