import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { roleLabel } from './roles';
import {
  IconGrid,
  IconDoc,
  IconVideo,
  IconBroadcast,
  IconTv,
  IconMic,
  IconHeadphones,
  IconCalendar,
  IconUsers,
  IconShare,
  IconBarChart,
  IconFolder,
  IconSettings,
  IconBell,
  IconChevronDown,
  IconLogout,
  IconLayout,
  IconCode,
  IconMail,
} from '../components/Icons';
import './admin.css';

const NAV_GROUPS = [
  {
    label: 'Tableau de bord',
    items: [{ to: '/admin', label: 'Vue synthèse', icon: IconGrid, end: true }],
  },
  {
    label: 'Contenu',
    items: [
      { to: '/admin/articles', label: 'Articles', icon: IconDoc },
      { to: '/admin/videos/new', label: 'Vidéos', icon: IconVideo },
      { to: '/admin/articles?category=emission', label: 'Émissions', icon: IconMic },
      { to: '/admin/articles?category=podcasts', label: 'Podcasts', icon: IconHeadphones },
      { to: '/admin/planning', label: 'Planning', icon: IconCalendar },
    ],
  },
  {
    label: 'Diffusion',
    items: [
      { to: '/admin/direct', label: 'Direct', icon: IconBroadcast },
      { to: '/admin/tv', label: 'TV', icon: IconTv },
      { to: '/admin/annonces', label: 'Annonces', icon: IconBell },
      { to: '/admin/messages', label: 'Messages', icon: IconMail },
    ],
  },
  {
    label: 'Audience',
    items: [
      { to: '/admin/analytics', label: 'Analytics', icon: IconBarChart },
      { to: '/admin/journalistes', label: 'Journalistes', icon: IconUsers },
      { to: '/admin/newsletter', label: 'Newsletter', icon: IconMail },
      { to: '/admin/flux', label: 'Réseaux', icon: IconShare },
    ],
  },
  {
    label: 'Site',
    items: [
      { to: '/admin/medias', label: 'Médias', icon: IconFolder },
      { to: '/admin/footer', label: 'Footer', icon: IconLayout },
      { to: '/admin/parametres', label: 'Paramètres', icon: IconSettings },
    ],
  },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="admin-shell">
      <header className="admin-topbar-bar">
        <Link to="/admin" className="admin-topbar-bar__brand">
          <img src="/logo.png" alt="" />
          <span>CORTEX TV</span>
        </Link>
        <div className="admin-topbar-bar__right">
          <span className="admin-live-pill">
            <span className="admin-live-pill__dot" /> DIRECT
          </span>
          <button className="icon-btn" aria-label="Notifications" type="button">
            <IconBell />
          </button>
          <ThemeToggle />
          {user?.is_developer && (
            <Link to="/admin/developpeur" className="admin-dev-btn">
              <IconCode /> Développeur
            </Link>
          )}
          <div className="admin-user-menu" ref={menuRef}>
            <button className="admin-user-menu__trigger" onClick={() => setMenuOpen((v) => !v)} type="button">
              <span className="admin-sidebar__avatar admin-sidebar__avatar--sm">{user?.name?.[0] || '?'}</span>
              {roleLabel(user?.role)}
              <IconChevronDown className="admin-user-menu__chevron" />
            </button>
            {menuOpen && (
              <div className="admin-user-menu__panel">
                <div className="admin-user-menu__name">{user?.name}</div>
                <button onClick={logout} type="button">
                  <IconLogout /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="admin-body">
        <main className="admin-main">{children}</main>
        <aside className="admin-sidebar">
          <nav className="admin-sidebar__nav">
            {NAV_GROUPS.map((group) => (
              <div className="admin-sidebar__group" key={group.label}>
                <div className="admin-sidebar__group-label">{group.label}</div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.to.includes('?')
                    ? currentPath === item.to
                    : !location.search && (
                        item.end
                          ? location.pathname === item.to
                          : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                      );
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={'admin-sidebar__link' + (active ? ' is-active' : '')}
                    >
                      <Icon />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
