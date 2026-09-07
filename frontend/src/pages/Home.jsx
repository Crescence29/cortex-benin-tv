import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { IconEye, IconBell, IconFacebook, IconYoutube, IconTikTok, IconWhatsApp } from '../components/Icons';
import './home.css';

const TAB_CATEGORIES = ['local', 'international', 'sports', 'culture', 'emission', 'musique', 'podcasts', 'jeunesse'];

function formatDate(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function readTime(content = '') {
  const words = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function formatViews(n = 0) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return `${n}`;
}

function HeroCard({ article, big }) {
  if (!article) return null;
  return (
    <Link to={`/article/${article.slug}`} className={`una-hero-card ${big ? 'una-hero-card--big' : ''}`}>
      {article.cover_image ? <img src={article.cover_image} alt={article.title} /> : <div className="una-hero-card__placeholder" />}
      <div className="una-hero-card__overlay" />
      <div className="una-hero-card__body">
        <span className="una-hero-card__kicker">{(article.tags && article.tags[0]?.name) || article.category_name}</span>
        {big && <span className="una-hero-card__meta">{formatDate(article.published_at)}</span>}
        <h2>{article.title}</h2>
        {big && article.excerpt && <p>{article.excerpt}</p>}
        <div className="una-hero-card__stats">
          <span><IconEye /> {formatViews(article.view_count)} vues</span>
          {big && <span>⏱ {readTime(article.content)} min</span>}
        </div>
      </div>
    </Link>
  );
}

function ListRow({ article }) {
  return (
    <article className="una-row">
      <Link to={`/article/${article.slug}`} className="una-row__media">
        {article.cover_image ? <img src={article.cover_image} alt={article.title} /> : <div className="una-row__placeholder" />}
      </Link>
      <div className="una-row__body">
        <span className="una-row__meta">
          <span className="una-row__kicker">{(article.tags && article.tags[0]?.name) || article.category_name}</span>
          {' '}| {new Date(article.published_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <h3><Link to={`/article/${article.slug}`}>{article.title}</Link></h3>
        {article.excerpt && <p>{article.excerpt}</p>}
        <span className="una-row__stats">
          <span><IconEye /> {formatViews(article.view_count)} vues</span>
          <span>⏱ {readTime(article.content)} min</span>
        </span>
      </div>
    </article>
  );
}

function AlertCard() {
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
    <div className="una-alert-card">
      <span className="una-alert-card__icon"><IconBell /></span>
      <h3>Alerte info</h3>
      <p>Recevez nos alertes en temps réel sur l'actualité du Bénin et du monde.</p>
      <form onSubmit={onSubmit}>
        <input type="email" required placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">S'abonner aux alertes</button>
      </form>
      {status && <p className="una-alert-card__status">{status}</p>}
    </div>
  );
}

export default function Home() {
  const { lang, t } = useLanguage();
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [mostRead, setMostRead] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('tout');
  const [feedItems, setFeedItems] = useState([]);

  useEffect(() => {
    api.getArticles({ lang, featured: 'true', limit: 4 }).then(setFeatured).catch(() => setFeatured([]));
    api.getArticles({ lang, sort: 'views', limit: 10 })
      .then((rows) => setMostRead(rows.filter((a) => a.category_slug !== 'international').slice(0, 5)))
      .catch(() => setMostRead([]));
    api.getCategories({ lang }).then(setCategories).catch(() => setCategories([]));
    api.getFeedItems({ limit: 5 }).then(setFeedItems).catch(() => setFeedItems([]));
  }, [lang]);

  useEffect(() => {
    const params = { lang, limit: 8 };
    if (activeTab !== 'tout') params.category = activeTab;
    api.getArticles(params).then(setLatest).catch(() => setLatest([]));
  }, [lang, activeTab]);

  const tabs = useMemo(
    () => categories.filter((c) => TAB_CATEGORIES.includes(c.slug)),
    [categories]
  );

  const [hero, ...side] = featured;

  return (
    <div className="una-page">
      <section className="una-hero-section">
        <div className="una-hero-section__overlay" />
        <div className="container una-hero-section__intro">
          <nav className="una-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Accueil</Link>
            <span>›</span>
            <span className="una-breadcrumb__current">À la Une</span>
          </nav>
          <h1>À LA UNE</h1>
          <span className="una-hero-section__rule" />
          <p>
            Les informations essentielles du moment, sélectionnées par la rédaction de Cortex
            Bénin TV.
          </p>
        </div>

        {hero && (
          <div className="container una-hero-grid">
            <HeroCard article={hero} big />
            <div className="una-hero-grid__side">
              {side.map((a) => (
                <HeroCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="container una-layout">
        <div className="una-main">
          <div className="una-main__header">
            <h2>Les dernières actualités</h2>
          </div>
          <div className="una-tabs">
            <button className={activeTab === 'tout' ? 'is-active' : ''} onClick={() => setActiveTab('tout')}>Tout</button>
            {tabs.map((c) => (
              <button key={c.slug} className={activeTab === c.slug ? 'is-active' : ''} onClick={() => setActiveTab(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>

          {latest.length === 0 && <p className="una-empty">{t('aucun_article')}</p>}
          <div className="una-rows">
            {latest.map((a) => (
              <ListRow key={a.id} article={a} />
            ))}
          </div>

          {latest.length > 0 && (
            <Link to={`/rubrique/${activeTab === 'tout' ? (tabs[0]?.slug || 'local') : activeTab}`} className="una-more-btn">
              Voir plus d'articles
            </Link>
          )}
        </div>

        <aside className="una-sidebar">
          {mostRead.length > 0 && (
            <div className="una-most-read">
              <h3>Les plus lus</h3>
              <ol>
                {mostRead.map((a, i) => (
                  <li key={a.id}>
                    <span className="una-most-read__rank">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <Link to={`/article/${a.slug}`}>{a.title}</Link>
                      <span>{formatViews(a.view_count)} vues</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {feedItems.length > 0 && (
            <div className="una-most-read">
              <h3>Revue de presse</h3>
              <ul className="una-feed-list">
                {feedItems.map((item) => (
                  <li key={item.id}>
                    <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
                    <span>{item.source_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AlertCard />

          <div className="una-social">
            <h3>Suivez-nous</h3>
            <div className="una-social__icons">
              <a href="https://www.facebook.com/cortexbenintv" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><IconFacebook /></a>
              <a href="https://youtube.com/@cortexbenintv" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><IconYoutube /></a>
              <a href="https://whatsapp.com/channel/0029VanTjhu05MUXjsn0l51S" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhatsApp /></a>
              <a href="https://vm.tiktok.com/ZS9Brm9XQDjB7-TbCqm/" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><IconTikTok /></a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
