import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import { IconMic, IconHeadphones, IconTv } from './Icons';

function CloseIcon(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

const QUICK_LINKS = [
  { label: 'Nos émissions', to: '/emissions', icon: IconMic },
  { label: 'Local', to: '/rubrique/local' },
  { label: 'International', to: '/rubrique/international' },
  { label: 'Grille des programmes', to: '/grille-tv', icon: IconTv },
];

const THEMATIQUES = [
  { label: 'Culture', to: '/rubrique/culture' },
  { label: 'Musique', to: '/rubrique/musique' },
  { label: 'Sports', to: '/rubrique/sports' },
  { label: 'Podcasts', to: '/rubrique/podcasts' },
  { label: 'Émission', to: '/rubrique/emission' },
  { label: 'Vidéos', to: '/videos' },
  { label: 'Local', to: '/rubrique/local' },
  { label: 'International', to: '/rubrique/international' },
  { label: 'Jeunesse', to: '/rubrique/jeunesse' },
];

export default function MobileMenu({ open, onClose }) {
  const { t } = useLanguage();
  const [tags, setTags] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.getTags({ limit: 8 }).then(setTags).catch(() => setTags([]));
    api.getLive().then((l) => setIsLive(!!l.is_live)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="mobile-menu-backdrop" onClick={onClose}>
      <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
      <div className="mobile-menu__header">
        <button type="button" className="mobile-menu__close" onClick={onClose}>
          <CloseIcon /> FERMER
        </button>
      </div>
      <div className="mobile-menu__divider" />

      <div className="mobile-menu__body">
        {tags.length > 0 && (
          <div className="mobile-menu__tags">
            {tags.map((tag) => (
              <Link key={tag.id} to={`/recherche?q=${encodeURIComponent(tag.name)}`} onClick={onClose} className="mobile-menu__tag">
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        <Link to="/direct" onClick={onClose} className={'mobile-menu__live' + (isLive ? ' is-live' : '')}>
          <IconTv /> DIRECT TV
        </Link>

        <Link to="/videos" onClick={onClose} className="mobile-menu__outline-btn">
          REPLAY
        </Link>

        <Link to="/videos?program=Journal%20du%20soir" onClick={onClose} className="mobile-menu__outline-btn">
          LE DERNIER JOURNAL
        </Link>

        <Link to="/podcasts" onClick={onClose} className="mobile-menu__outline-btn">
          <IconHeadphones /> PODCASTS
        </Link>

        <div className="mobile-menu__list">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={onClose} className="mobile-menu__list-item">
                {Icon && <Icon className="mobile-menu__list-icon" />}
                {item.label.toUpperCase()}
              </Link>
            );
          })}
        </div>

        <div className="mobile-menu__section-divider" />
        <p className="mobile-menu__section-title">Thématiques</p>
        <div className="mobile-menu__grid">
          {THEMATIQUES.map((item) => (
            <Link key={item.label} to={item.to} onClick={onClose} className="mobile-menu__grid-item">
              {item.label.toUpperCase()}
            </Link>
          ))}
        </div>

        <div className="mobile-menu__section-divider" />
        <p className="mobile-menu__section-title">Réglages</p>
        <div className="mobile-menu__settings">
          <div className="mobile-menu__settings-row">
            <span>Langue</span>
            <LanguageSelect />
          </div>
          <div className="mobile-menu__settings-row">
            <span>Apparence</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
