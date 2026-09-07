import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { IconReplay, IconSearch, IconEye, IconGrid } from '../components/Icons';
import './videos.css';

const RECENT_KEY = 'cortex_recent_videos';

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatViews(n = 0) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
  return `${n}`;
}

function pushRecent(id) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((x) => x !== id);
    list.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
  } catch {
    /* ignore */
  }
}

function getRecentIds() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function VideoTile({ video }) {
  const duration = formatDuration(video.duration_seconds);
  return (
    <Link to={`/video/${video.slug}`} className="rp-tile" onClick={() => pushRecent(video.id)}>
      <div className="rp-tile__media">
        {video.thumbnail ? <img src={video.thumbnail} alt={video.title} /> : <div className="rp-tile__placeholder" />}
        <span className="rp-tile__play"><IconReplay /></span>
        {duration && <span className="rp-tile__duration">{duration}</span>}
      </div>
      <div className="rp-tile__body">
        {video.program && <span className="rp-tile__program">{video.program}</span>}
        <h3>{video.title}</h3>
        <div className="rp-tile__meta">
          <span>{formatDate(video.published_at)}</span>
          <span><IconEye /> {formatViews(video.view_count)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Videos() {
  const [searchParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('tout');
  const [sort, setSort] = useState('recent');
  const [query, setQuery] = useState(searchParams.get('program') || '');
  const [mostWatched, setMostWatched] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);

  useEffect(() => {
    api.getCategories({ lang: 'fr' }).then(setCategories).catch(() => setCategories([]));
    api.getVideos({ lang: 'fr', sort: 'views', limit: 5 }).then(setMostWatched).catch(() => setMostWatched([]));
  }, []);

  useEffect(() => {
    const params = { lang: 'fr', limit: 24 };
    if (activeCategory !== 'tout') params.category = activeCategory;
    if (sort === 'views') params.sort = 'views';
    api.getVideos(params).then(setVideos).catch(() => setVideos([]));
  }, [activeCategory, sort]);

  useEffect(() => {
    const ids = getRecentIds();
    if (ids.length === 0) return;
    api.getVideos({ lang: 'fr', limit: 50 }).then((all) => {
      const bySlugMap = new Map(all.map((v) => [v.id, v]));
      setRecentVideos(ids.map((id) => bySlugMap.get(id)).filter(Boolean));
    }).catch(() => {});
  }, [videos]);

  const filtered = useMemo(() => {
    if (!query.trim()) return videos;
    const q = query.trim().toLowerCase();
    return videos.filter((v) => v.title.toLowerCase().includes(q) || v.program?.toLowerCase().includes(q));
  }, [videos, query]);

  return (
    <div className="rp-page">
      <div className="container rp-breadcrumb">
        <Link to="/">Accueil</Link>
        <span>›</span>
        <span className="rp-breadcrumb__current">Replays</span>
      </div>

      <div className="container rp-header">
        <span className="rp-header__icon"><IconReplay /></span>
        <div>
          <h1>REPLAYS</h1>
          <p>Revivez vos émissions préférées quand vous voulez. Tous nos programmes sont disponibles en replay.</p>
        </div>
      </div>

      <div className="container rp-filters">
        <button className={activeCategory === 'tout' ? 'is-active' : ''} onClick={() => setActiveCategory('tout')}>
          <IconGrid /> Tous les programmes
        </button>
        {categories.map((c) => (
          <button key={c.slug} className={activeCategory === c.slug ? 'is-active' : ''} onClick={() => setActiveCategory(c.slug)}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="container rp-toolbar">
        <div className="rp-search">
          <IconSearch />
          <input placeholder="Rechercher une émission…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="rp-sort">
          <button className={sort === 'recent' ? 'is-active' : ''} onClick={() => setSort('recent')}>Plus récentes</button>
          <button className={sort === 'views' ? 'is-active' : ''} onClick={() => setSort('views')}>Plus vues</button>
        </div>
      </div>

      <div className="container rp-layout">
        <div className="rp-main">
          <div className="rp-section__header">
            <h2>{activeCategory === 'tout' ? 'Toutes les vidéos' : categories.find((c) => c.slug === activeCategory)?.name}</h2>
          </div>
          {filtered.length === 0 ? (
            <p className="rp-empty">Aucune vidéo disponible pour le moment.</p>
          ) : (
            <div className="rp-grid">
              {filtered.map((v) => (
                <VideoTile key={v.id} video={v} />
              ))}
            </div>
          )}
        </div>

        <aside className="rp-sidebar">
          {recentVideos.length > 0 && (
            <div className="rp-side-card">
              <h3>Vus récemment</h3>
              <ul>
                {recentVideos.map((v) => (
                  <li key={v.id}>
                    <Link to={`/video/${v.slug}`}>{v.title}</Link>
                    <span>{v.program}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mostWatched.length > 0 && (
            <div className="rp-side-card">
              <h3>Les plus regardés</h3>
              <ol>
                {mostWatched.map((v, i) => (
                  <li key={v.id}>
                    <span className="rp-side-card__rank">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <Link to={`/video/${v.slug}`}>{v.title}</Link>
                      <span>{formatViews(v.view_count)} vues</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
