import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import { IconPlay, IconMic, IconSearch, IconMenu, IconBroadcast, IconReplay, IconMapPin } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api';
import MobileMenu from './MobileMenu';
import SettingsMenu from './SettingsMenu';
import Logo from './Logo';
import './Header.css';

export default function Header() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getLive('local').then((l) => setIsLive(!!l.is_live)).catch(() => {});
  }, []);

  const PRIMARY_NAV = [
    { label: t('la_une'), to: '/' },
    { label: t('podcasts'), to: '/podcasts', icon: IconMic },
    { label: t('en_continu'), to: '/direct', icon: IconBroadcast },
    { label: t('replays'), to: '/videos', icon: IconReplay },
    { label: "24H Pour l'Information", to: '/en-direct-local', icon: IconMapPin },
  ];

  const RUBRIQUES = [
    { label: t('local'), to: '/rubrique/local' },
    { label: t('international'), to: '/rubrique/international' },
    { label: t('culture'), to: '/rubrique/culture' },
    { label: t('emission'), to: '/emissions' },
    { label: t('musique'), to: '/rubrique/musique' },
    { label: t('sports'), to: '/rubrique/sports' },
    { label: t('jeunesse'), to: '/rubrique/jeunesse' },
  ];

  function onSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__top container">
        <Link to="/" className="brand">
          <span className="brand__logo-box">
            <Logo imgAlt="Cortex Bénin TV" />
          </span>
        </Link>

        <nav className="primary-nav">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => 'primary-nav__link' + (isActive ? ' is-active' : '')}
              >
                {Icon && <Icon className="primary-nav__icon" />}
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="live-links">
          <Link to="/en-direct-local" className={'live-link' + (isLive ? ' is-live' : '')}>
            <IconPlay className="live-link__dot" /> {t('en_direct')}
          </Link>
        </div>

        <div className="header-actions">
          <form className={'search' + (searchOpen ? ' is-open' : '')} onSubmit={onSearch}>
            <input
              type="search"
              placeholder={t('rechercher')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('rechercher')}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <IconSearch />
          </button>
          <ThemeToggle />
          <LanguageSelect />
          <SettingsMenu />
          <button type="button" className="menu-btn" onClick={() => setMenuOpen(true)}>
            <IconMenu className="menu-btn__icon" /> {t('menu')}
          </button>
        </div>
      </div>

      <div className="site-header__divider" />

      <nav className="site-nav container">
        {RUBRIQUES.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 'site-nav__link' + (isActive ? ' is-active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
