import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { IconTv, IconSearch, IconCalendar } from '../components/Icons';
import './emissions.css';

export default function Emissions() {
  const [shows, setShows] = useState([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('tout');

  useEffect(() => {
    api.getShows().then(setShows).catch(() => setShows([]));
  }, []);

  const categories = useMemo(() => {
    const map = new Map();
    shows.forEach((s) => {
      if (s.category_slug) map.set(s.category_slug, s.category_name);
    });
    return Array.from(map, ([slug, name]) => ({ slug, name }));
  }, [shows]);

  const filtered = useMemo(() => {
    let list = shows;
    if (activeCategory !== 'tout') list = list.filter((s) => s.category_slug === activeCategory);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
    }
    return list;
  }, [shows, activeCategory, query]);

  return (
    <div className="em-page">
      <section className="em-hero">
        <div className="em-hero__overlay" />
        <div className="container em-breadcrumb">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <span className="em-breadcrumb__current">Émissions</span>
        </div>

        <div className="container em-header">
          <span className="em-header__icon"><IconTv /></span>
          <div>
            <h1>ÉMISSIONS</h1>
            <p>Des programmes qui informent, éduquent, divertissent et rassemblent.</p>
          </div>
        </div>
      </section>

      <div className="container em-toolbar">
        {categories.length > 0 && (
          <div className="em-tabs">
            <button className={activeCategory === 'tout' ? 'is-active' : ''} onClick={() => setActiveCategory('tout')}>Toutes</button>
            {categories.map((c) => (
              <button key={c.slug} className={activeCategory === c.slug ? 'is-active' : ''} onClick={() => setActiveCategory(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="em-search">
          <IconSearch />
          <input placeholder="Rechercher une émission…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="container em-section">
        <div className="em-section__header">
          <h2>Toutes les émissions</h2>
          <Link to="/grille-tv" className="em-section__link"><IconCalendar /> Voir le programme TV</Link>
        </div>

        {filtered.length === 0 ? (
          <p className="em-empty">Aucune émission disponible pour le moment.</p>
        ) : (
          <div className="em-grid">
            {filtered.map((s) => (
              <div className="em-card" key={s.id}>
                <div className="em-card__logo" style={{ background: s.logo_url ? s.bg_color : undefined }}>
                  {s.logo_url ? <img src={s.logo_url} alt={s.name} /> : <span className="em-card__text-badge">{s.name}</span>}
                </div>
                <div className="em-card__body">
                  {s.category_name && <span className="em-card__category">{s.category_name}</span>}
                  <h3>{s.name}</h3>
                  {s.description && <p>{s.description}</p>}
                  {s.schedule_label && <span className="em-card__schedule"><IconCalendar /> {s.schedule_label}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SubscribeBand />
    </div>
  );
}

function SubscribeBand() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await api.subscribeNewsletter(email);
      setStatus(res.alreadySubscribed ? 'Déjà abonné.' : 'Inscription confirmée !');
      setEmail('');
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div className="container em-subscribe">
      <div className="em-subscribe__intro">
        <span className="em-subscribe__icon"><IconTv /></span>
        <div>
          <h3>Ne manquez aucune émission !</h3>
          <p>Abonnez-vous à notre newsletter et recevez le programme complet chaque semaine.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="em-subscribe__form">
        <input type="email" required placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">S'abonner</button>
      </form>
      {status && <p className="em-subscribe__status">{status}</p>}
    </div>
  );
}
