import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { IconSearch, IconEye } from '../components/Icons';
import './search.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatViews(n = 0) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return `${n}`;
}

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { lang, t } = useLanguage();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = q ? `Recherche « ${q} » — Cortex Bénin TV` : 'Recherche — Cortex Bénin TV';
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getArticles({ lang, q, limit: 24 }).then(setResults).finally(() => setLoading(false));
    return () => {
      document.title = 'Cortex Bénin TV';
    };
  }, [q, lang]);

  return (
    <div className="src-page">
      <div className="container src-breadcrumb">
        <Link to="/">Accueil</Link>
        <span>›</span>
        <span className="src-breadcrumb__current">Recherche</span>
      </div>

      <div className="container src-header">
        <span className="src-header__icon"><IconSearch /></span>
        <div>
          <h1>{t('resultats_pour')} « {q} »</h1>
          {!loading && <p>{results.length} résultat{results.length !== 1 ? 's' : ''} trouvé{results.length !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      <div className="container src-body">
        {loading && <p className="src-empty">{t('recherche_en_cours')}</p>}
        {!loading && results.length === 0 && <p className="src-empty">{t('aucun_resultat')}</p>}

        <div className="src-grid">
          {results.map((a) => (
            <Link to={`/article/${a.slug}`} key={a.id} className="src-card">
              <div className="src-card__media">
                {a.cover_image ? <img src={a.cover_image} alt={a.title} /> : <div className="src-card__placeholder" />}
              </div>
              <div className="src-card__body">
                <span className="src-card__kicker">{a.category_name}</span>
                <h3>{a.title}</h3>
                {a.excerpt && <p>{a.excerpt}</p>}
                <div className="src-card__meta">
                  <span>{formatDate(a.published_at)}</span>
                  <span><IconEye /> {formatViews(a.view_count)} vues</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
