import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  IconPlay,
  IconHeadphones,
  IconBroadcast,
  IconMapPin,
  IconGlobe,
  IconMask,
  IconTv,
  IconMusic,
  IconSports,
  IconUsers,
  IconMic,
} from '../components/Icons';
import './podcasts.css';

const LISTEN_CATEGORIES = ['podcasts', 'emission', 'musique'];

const CATEGORY_ICONS = {
  local: IconMapPin,
  international: IconGlobe,
  culture: IconMask,
  emission: IconTv,
  musique: IconMusic,
  sports: IconSports,
  jeunesse: IconUsers,
  podcasts: IconMic,
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function EpisodeCard({ item }) {
  const to = item.kind === 'video' ? `/video/${item.slug}` : `/article/${item.slug}`;
  const image = item.cover_image || item.thumbnail;
  return (
    <Link to={to} className="pod-card">
      <div className="pod-card__media">
        {image ? <img src={image} alt={item.title} /> : <div className="pod-card__placeholder"><IconHeadphones /></div>}
        <span className="pod-card__play"><IconPlay /></span>
      </div>
      <div className="pod-card__body">
        <span className="pod-card__kicker">{item.category_name}</span>
        <h3>{item.title}</h3>
        <span className="pod-card__date">{formatDate(item.published_at)}</span>
      </div>
    </Link>
  );
}

export default function Podcasts() {
  const [live, setLive] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('tout');

  useEffect(() => {
    api.getLive().then(setLive).catch(() => setLive(null));
    api.getCategories({ lang: 'fr' }).then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const cats = activeTab === 'tout' ? LISTEN_CATEGORIES : [activeTab];
    Promise.all([
      Promise.all(cats.map((c) => api.getArticles({ lang: 'fr', category: c, limit: 12 }))),
      api.getVideos({ lang: 'fr', limit: 12 }),
    ]).then(([articleLists, videos]) => {
      const articles = articleLists.flat().map((a) => ({ ...a, kind: 'article' }));
      const vids = (activeTab === 'tout' || activeTab === 'emission')
        ? videos.map((v) => ({ ...v, kind: 'video', category_name: v.category_name || 'Émission' }))
        : [];
      const merged = [...articles, ...vids].sort(
        (a, b) => new Date(b.published_at) - new Date(a.published_at)
      );
      setItems(merged);
    }).catch(() => setItems([]));
  }, [activeTab]);

  const tabCategories = useMemo(
    () => categories.filter((c) => Object.keys(CATEGORY_ICONS).includes(c.slug)),
    [categories]
  );

  const exploreCategories = useMemo(
    () => categories.filter((c) => Object.keys(CATEGORY_ICONS).includes(c.slug) && c.slug !== 'podcasts'),
    [categories]
  );

  return (
    <div className="pod-page">
      <section className="pod-hero">
        <div className="pod-hero__overlay" />
        <div className="container pod-hero__grid">
          <div className="pod-hero__intro">
            <h1>PODCASTS</h1>
            <span className="pod-hero__rule" />
            <p>Écoutez l'actualité, les analyses et nos émissions où que vous soyez.</p>
            <div className="pod-hero__actions">
              <Link to="/direct" className="pod-btn pod-btn--primary">
                <IconBroadcast /> Écouter en direct
              </Link>
              <Link to="/rubrique/podcasts" className="pod-btn pod-btn--outline">
                <IconHeadphones /> Tous les podcasts
              </Link>
            </div>
          </div>

          <div className="pod-live-card">
            <span className="pod-live-card__label">En ce moment</span>
            {live?.is_live ? (
              <>
                <div className="pod-live-card__row">
                  <span className="pod-live-card__thumb"><IconBroadcast /></span>
                  <div>
                    <h3>{live.title || 'Cortex Bénin TV'}</h3>
                    <span className="pod-live-card__badge"><span className="dot" /> En direct</span>
                  </div>
                </div>
                <Link to="/direct" className="pod-live-card__btn">Regarder / écouter</Link>
              </>
            ) : (
              <p className="pod-live-card__empty">Pas de direct en ce moment. Revenez bientôt.</p>
            )}
          </div>
        </div>
      </section>

      <div className="container pod-tabs">
        <button className={activeTab === 'tout' ? 'is-active' : ''} onClick={() => setActiveTab('tout')}>
          <IconHeadphones /> Tout
        </button>
        {tabCategories.map((c) => {
          const Icon = CATEGORY_ICONS[c.slug];
          return (
            <button key={c.slug} className={activeTab === c.slug ? 'is-active' : ''} onClick={() => setActiveTab(c.slug)}>
              <Icon /> {c.name}
            </button>
          );
        })}
      </div>

      <div className="container pod-section">
        <div className="pod-section__header">
          <h2>Nos podcasts &amp; émissions</h2>
        </div>
        {items.length === 0 ? (
          <p className="pod-empty">Aucun contenu disponible pour le moment dans cette catégorie.</p>
        ) : (
          <div className="pod-grid">
            {items.map((item) => (
              <EpisodeCard key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </div>

      <div className="container pod-section">
        <div className="pod-section__header">
          <h2>Explorez par thématique</h2>
        </div>
        <div className="pod-explore-grid">
          {exploreCategories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug];
            return (
              <Link to={`/rubrique/${c.slug}`} key={c.slug} className="pod-explore-card">
                <Icon />
                <span>{c.name}</span>
              </Link>
            );
          })}
        </div>
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
    <div className="container pod-subscribe">
      <div className="pod-subscribe__intro">
        <span className="pod-subscribe__icon"><IconHeadphones /></span>
        <div>
          <h3>Ne manquez rien de l'actualité</h3>
          <p>Abonnez-vous à nos alertes et recevez les nouveaux épisodes.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="pod-subscribe__form">
        <input type="email" required placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">S'abonner</button>
      </form>
      {status && <p className="pod-subscribe__status">{status}</p>}
    </div>
  );
}
