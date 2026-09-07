import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { IconEye, IconFacebook, IconWhatsApp, IconLink } from '../components/Icons';
import AudioPlayer, { isAudioUrl } from '../components/AudioPlayer';
import { useSEO } from '../lib/useSEO';
import './video.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
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
    <div className="vid-share">
      <span>Partager</span>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Partager sur Facebook">
        <IconFacebook />
      </a>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Partager sur WhatsApp">
        <IconWhatsApp />
      </a>
      <button type="button" onClick={copyLink} aria-label="Copier le lien">
        <IconLink />
      </button>
      {copied && <span className="vid-share__copied">Lien copié !</span>}
    </div>
  );
}

export default function Video() {
  const { slug } = useParams();
  const { lang, t } = useLanguage();
  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    setVideo(null);
    window.scrollTo(0, 0);
    api.getVideo(slug).then(setVideo).catch(() => {});
  }, [slug]);

  useSEO(
    video
      ? { title: video.title, description: video.description, image: video.thumbnail }
      : undefined
  );

  useEffect(() => {
    if (!video) return;
    api
      .getVideos({ lang, category: video.category_slug, limit: 5 })
      .then((list) => setRelated(list.filter((v) => v.slug !== video.slug).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [video, lang]);

  if (!video) return <div className="container section"><p>{t('chargement')}</p></div>;

  return (
    <div className="vid-page">
      <div className="container vid-breadcrumb">
        <Link to="/">Accueil</Link>
        <span>›</span>
        <Link to="/videos">Replays</Link>
      </div>

      <div className="container vid-page__inner">
        {isAudioUrl(video.video_url) ? (
          <AudioPlayer src={video.video_url} title={video.title} cover={video.thumbnail} />
        ) : (
          <div className="vid-player">
            <video src={video.video_url} controls poster={video.thumbnail} />
          </div>
        )}

        <span className="vid-category">{video.category_name}{video.program ? ` · ${video.program}` : ''}</span>
        <h1>{video.title}</h1>

        <div className="vid-meta">
          <span>{formatDate(video.published_at)}</span>
          <span><IconEye /> {formatViews(video.view_count)} vues</span>
        </div>

        {video.description && <p className="vid-description">{video.description}</p>}

        <ShareBar title={video.title} />
      </div>

      {related.length > 0 && (
        <div className="container vid-related">
          <h2>À voir aussi</h2>
          <div className="vid-related__grid">
            {related.map((v) => (
              <Link to={`/video/${v.slug}`} key={v.id} className="vid-related__card">
                <div className="vid-related__media">
                  {v.thumbnail ? <img src={v.thumbnail} alt={v.title} /> : <div className="vid-related__placeholder" />}
                </div>
                {v.program && <span className="vid-related__program">{v.program}</span>}
                <h3>{v.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
