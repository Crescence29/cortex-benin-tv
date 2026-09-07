import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { IconEye, IconPlay, IconMail } from '../components/Icons';
import { useSEO } from '../lib/useSEO';
import './category.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function readTime(content = '') {
  const words = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function formatViews(n = 0) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return `${n}`;
}

const UNAVAILABLE_CATEGORIES = ['international'];

const HERO_IMAGES = {
  local: '/image/local.jpg',
  culture: '/image/culture.jpg',
  musique: '/image/musique.jpg',
  sports: '/image/sports.jpg',
  jeunesse: '/image/jeunesse.jpg',
};

export default function Category() {
  const { slug } = useParams();
  const { lang, t } = useLanguage();
  const [categoryName, setCategoryName] = useState(slug);
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('tout');

  const isUnavailable = UNAVAILABLE_CATEGORIES.includes(slug);

  useSEO({
    title: categoryName,
    description: `Toute l'actualité « ${categoryName} » du Bénin en temps réel sur Cortex Bénin TV.`,
  });

  useEffect(() => {
    api.getCategories({ lang }).then((cats) => {
      const found = cats.find((c) => c.slug === slug);
      if (found) setCategoryName(found.name);
    });
  }, [slug, lang]);

  useEffect(() => {
    if (isUnavailable) {
      setArticles([]);
      setVideos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setActiveTag('tout');
    Promise.all([
      api.getArticles({ lang, category: slug, limit: 30 }),
      api.getVideos({ lang, category: slug, limit: 6 }),
    ])
      .then(([a, v]) => {
        setArticles(a);
        setVideos(v);
      })
      .finally(() => setLoading(false));
  }, [slug, lang, isUnavailable]);

  const tags = useMemo(() => {
    const set = new Map();
    articles.forEach((a) => (a.tags || []).forEach((t) => set.set(t.slug, t.name)));
    return Array.from(set, ([slug, name]) => ({ slug, name }));
  }, [articles]);

  const filtered = useMemo(() => {
    if (activeTag === 'tout') return articles;
    return articles.filter((a) => (a.tags || []).some((t) => t.slug === activeTag));
  }, [articles, activeTag]);

  const featured = articles.filter((a) => a.is_featured);
  const hero = featured[0] || articles[0];
  const sideFeatured = featured.filter((a) => a.id !== hero?.id).slice(0, 4);
  const listArticles = filtered.filter((a) => a.id !== hero?.id);

  if (loading) {
    return <div className="container section"><p>{t('chargement')}</p></div>;
  }

  const heroImage = HERO_IMAGES[slug];

  return (
    <div className="cat-page">
      <section
        className="cat-hero"
        style={heroImage ? { '--cat-hero-image': `url(${heroImage})` } : undefined}
      >
        <div className="cat-hero__overlay" />
        <div className="container cat-hero__intro">
          <nav className="cat-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Accueil</Link>
            <span>›</span>
            <span className="cat-breadcrumb__current">{categoryName}</span>
          </nav>
          <h1>{categoryName?.toUpperCase()}</h1>
          <span className="cat-hero__rule" />
          <p>Toute l'actualité « {categoryName} » en temps réel.</p>
        </div>
      </section>

      {isUnavailable ? (
        <div className="container">
          <UnavailableBadge />
        </div>
      ) : articles.length === 0 ? (
        <div className="container cat-empty">
          <p>{t('aucun_article')}</p>
        </div>
      ) : (
        <div className="container cat-layout">
          <div className="cat-main">
            {hero && (
              <Link to={`/article/${hero.slug}`} className="cat-hero-card">
                <span className="cat-hero-card__badge">À la une</span>
                {hero.cover_image ? <img src={hero.cover_image} alt={hero.title} /> : <div className="cat-hero-card__placeholder" />}
                <div className="cat-hero-card__overlay" />
                <div className="cat-hero-card__body">
                  <span className="cat-hero-card__kicker">{(hero.tags && hero.tags[0]?.name) || categoryName} | {formatDate(hero.published_at)}</span>
                  <h2>{hero.title}</h2>
                  {hero.excerpt && <p>{hero.excerpt}</p>}
                  <div className="cat-hero-card__stats">
                    <span><IconEye /> {formatViews(hero.view_count)} vues</span>
                    <span>⏱ {readTime(hero.content)} min</span>
                  </div>
                </div>
              </Link>
            )}

            <div className="cat-section__header">
              <h2>Actualités « {categoryName} »</h2>
            </div>

            {tags.length > 0 && (
              <div className="cat-tabs">
                <button className={activeTag === 'tout' ? 'is-active' : ''} onClick={() => setActiveTag('tout')}>Tout</button>
                {tags.map((tg) => (
                  <button key={tg.slug} className={activeTag === tg.slug ? 'is-active' : ''} onClick={() => setActiveTag(tg.slug)}>
                    {tg.name}
                  </button>
                ))}
              </div>
            )}

            <div className="cat-rows">
              {listArticles.map((a) => (
                <Link to={`/article/${a.slug}`} key={a.id} className="cat-row">
                  <span className="cat-row__media">
                    {a.cover_image ? <img src={a.cover_image} alt={a.title} /> : <span className="cat-row__placeholder" />}
                  </span>
                  <span className="cat-row__body">
                    <span className="cat-row__meta">
                      <span className="cat-row__kicker">{(a.tags && a.tags[0]?.name) || categoryName}</span> | {formatDate(a.published_at)}
                    </span>
                    <h3>{a.title}</h3>
                    {a.excerpt && <p>{a.excerpt}</p>}
                    <span className="cat-row__stats">
                      <span><IconEye /> {formatViews(a.view_count)} vues</span>
                      <span>⏱ {readTime(a.content)} min</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="cat-sidebar">
            {sideFeatured.length > 0 && (
              <div className="cat-side-card">
                <h3>À la une</h3>
                <ul>
                  {sideFeatured.map((a) => (
                    <li key={a.id}>
                      <Link to={`/article/${a.slug}`} className="cat-side-item">
                        <span className="cat-side-item__media">
                          {a.cover_image ? <img src={a.cover_image} alt={a.title} /> : <span className="cat-side-item__placeholder" />}
                        </span>
                        <span>
                          <span className="cat-side-item__kicker">{(a.tags && a.tags[0]?.name) || categoryName}</span>
                          <span className="cat-side-item__title">{a.title}</span>
                          <span className="cat-side-item__stats"><IconEye /> {formatViews(a.view_count)} vues</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {videos.length > 0 && (
              <div className="cat-side-card">
                <h3>Vidéos</h3>
                <div className="cat-side-videos">
                  {videos.map((v) => (
                    <Link to={`/video/${v.slug}`} key={v.id} className="cat-side-video">
                      <span className="cat-side-video__media">
                        {v.thumbnail ? <img src={v.thumbnail} alt={v.title} /> : <span className="cat-side-video__placeholder" />}
                        <span className="cat-side-video__play"><IconPlay /></span>
                      </span>
                      <span className="cat-side-video__title">{v.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <SubscribeCard categoryName={categoryName} />
          </aside>
        </div>
      )}
    </div>
  );
}

function UnavailableBadge() {
  return (
    <div className="cat-unavailable">
      <div className="cat-unavailable__loader">
        <span />
        <span />
        <span />
      </div>
      <h2>Contenu indisponible pour le moment</h2>
      <p>Cette rubrique est en cours de préparation. Revenez bientôt pour découvrir son contenu.</p>
    </div>
  );
}

function SubscribeCard({ categoryName }) {
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
    <div className="cat-side-card cat-newsletter">
      <span className="cat-newsletter__icon"><IconMail /></span>
      <h3>Newsletter</h3>
      <p>Recevez chaque jour l'essentiel de l'actualité « {categoryName} ».</p>
      <form onSubmit={onSubmit}>
        <input type="email" required placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">S'abonner</button>
      </form>
      {status && <p className="cat-newsletter__status">{status}</p>}
    </div>
  );
}
