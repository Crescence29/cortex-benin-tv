import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { IconSettings, IconMail, IconBell, IconShield, IconChevronDown } from './Icons';
import ConsentSettings from './ConsentSettings';

function NewsletterPanel() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const res = await api.subscribeNewsletter(email);
      setStatus(res.alreadySubscribed ? 'Vous êtes déjà abonné avec cette adresse.' : 'Inscription confirmée, merci !');
      setEmail('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="settings-panel__form">
      <p className="settings-panel__hint">Recevez les actualités de Cortex Bénin TV par email.</p>
      {error && <p className="settings-panel__error">{error}</p>}
      {status && <p className="settings-panel__success">{status}</p>}
      <input
        type="email"
        required
        placeholder="vous@exemple.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="btn btn--sm">S'abonner</button>
    </form>
  );
}

function NotificationsPanel() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported');

  async function onRequest() {
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const labels = {
    granted: 'Notifications activées sur ce navigateur.',
    denied: 'Notifications bloquées — modifiez ce réglage dans votre navigateur.',
    default: "Les notifications ne sont pas encore activées.",
    unsupported: "Votre navigateur ne prend pas en charge les notifications.",
  };

  return (
    <div className="settings-panel__form">
      <p className="settings-panel__hint">{labels[permission]}</p>
      {supported && permission === 'default' && (
        <button type="button" className="btn btn--sm" onClick={onRequest}>Activer les notifications</button>
      )}
    </div>
  );
}

const ITEMS = [
  { key: 'newsletter', label: "S'abonner aux newsletters", icon: IconMail, Panel: NewsletterPanel },
  { key: 'notifications', label: 'Gérer les notifications', icon: IconBell, Panel: NotificationsPanel },
  { key: 'consent', label: 'Gérer mes consentements', icon: IconShield, Panel: ConsentSettings },
];

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setView(null);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const activeItem = ITEMS.find((i) => i.key === view);

  return (
    <div className="settings-menu" ref={ref}>
      <button
        type="button"
        className="settings-menu__trigger"
        onClick={() => {
          setOpen((v) => !v);
          setView(null);
        }}
        aria-expanded={open}
      >
        <IconSettings /> RÉGLAGES
        <IconChevronDown className={'settings-menu__chevron' + (open ? ' is-open' : '')} />
      </button>

      {open && (
        <div className="settings-menu__panel">
          {!activeItem &&
            ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} type="button" className="settings-menu__item" onClick={() => setView(item.key)}>
                  <Icon /> {item.label.toUpperCase()}
                </button>
              );
            })}

          {activeItem && (
            <div className="settings-panel">
              <button type="button" className="settings-panel__back" onClick={() => setView(null)}>
                ← {activeItem.label}
              </button>
              <activeItem.Panel />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
