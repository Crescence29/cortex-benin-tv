import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { IconEye, IconFacebook, IconWhatsApp, IconLink } from '../components/Icons';
import { sanitizeHtml } from '../lib/sanitize';
import { useSEO } from '../lib/useSEO';
import './article.css';

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

function ShareBar({ title }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="art-share">
      <span>Partager</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Partager sur Facebook"
      >
        <IconFacebook />
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Partager sur WhatsApp"
      >
        <IconWhatsApp />
      </a>
      <button type="button" onClick={copyLink} aria-label="Copier le lien">
        <IconLink />
      </button>
      {copied && <span className="art-share__copied">Lien copié !</span>}
    </div>
  );
}

export default function Article() {
  const { slug } = useParams();
  const { lang, t } = useLanguage();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setArticle(null);
    setError(null);
    window.scrollTo(0, 0);
    api.getArticle(slug).catch(() => setError(true)).then((a) => a && setArticle(a));
  }, [slug]);

  useSEO(
    article
      ? { title: article.title, description: article.excerpt, image: article.cover_image }
      : undefined
  );

  useEffect(() => {
    if (!article) return;
    api
      .getArticles({ lang, category: article.category_slug, limit: 5 })
      .then((list) => setRelated(list.filter((a) => a.slug !== article.slug).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [article, lang]);

  if (error) return <div className="container section"><p>{t('article_introuvable')}</p></div>;
  if (!article) return <div className="container section"><p>{t('chargement')}</p></div>;

  return (
    <div className="art-page">
      <div className="container art-breadcrumb">
        <Link to="/">Accueil</Link>
        <span>›</span>
        <Link to={`/rubrique/${article.category_slug}`}>{article.category_name}</Link>
      </div>

      <article className="container art-page__inner">
        <span className="art-category">{article.category_name}</span>
        <h1>{article.title}</h1>
        {article.excerpt && <p className="art-excerpt">{article.excerpt}</p>}

        <div className="art-meta">
          <span>{t('par')} <strong>{article.author_name}</strong></span>
          <span>{formatDate(article.published_at)}</span>
          <span>⏱ {readTime(article.content)} min</span>
          <span><IconEye /> {formatViews(article.view_count)} vues</span>
        </div>

        {article.cover_image && (
          <div className="art-cover">
            <img src={article.cover_image} alt={article.title} />
          </div>
        )}

        <div className="art-body">
          <div className="art-page__content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />

          {article.tags?.length > 0 && (
            <div className="art-tags">
              {article.tags.map((tg) => (
                <span key={tg.slug} className="art-tags__pill">{tg.name}</span>
              ))}
            </div>
          )}

          <ShareBar title={article.title} />
        </div>
      </article>

      {related.length > 0 && (
        <div className="container art-related">
          <h2>Articles similaires</h2>
          <div className="art-related__grid">
            {related.map((a) => (
              <Link to={`/article/${a.slug}`} key={a.id} className="art-related__card">
                <div className="art-related__media">
                  {a.cover_image ? <img src={a.cover_image} alt={a.title} /> : <div className="art-related__placeholder" />}
                </div>
                <h3>{a.title}</h3>
                <span>{formatDate(a.published_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
