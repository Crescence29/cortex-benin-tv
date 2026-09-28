import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { IconTarget, IconImage, IconVideo, IconCalendar } from '../components/Icons';
import './projects.css';

export default function Projects() {
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  return (
    <div className="pj-page">
      <section className="pj-hero">
        <div className="pj-hero__overlay" />
        <div className="container pj-breadcrumb">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <span className="pj-breadcrumb__current">Projets</span>
        </div>

        <div className="container pj-header">
          <span className="pj-header__icon"><IconTarget /></span>
          <div>
            <h1>PROJETS & CAMPAGNES</h1>
            <p>Nos campagnes de sensibilisation et projets spéciaux : affiches, flyers et vidéos réalisés sur le terrain.</p>
          </div>
        </div>
      </section>

      <div className="container pj-section">
        {projects === null ? (
          <p className="pj-empty">Chargement…</p>
        ) : projects.length === 0 ? (
          <p className="pj-empty">Aucun projet publié pour le moment.</p>
        ) : (
          <div className="pj-grid">
            {projects.map((p) => (
              <Link to={`/projets/${p.slug}`} className="pj-card" key={p.id}>
                <div className="pj-card__cover">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.title} />
                  ) : (
                    <span className="pj-card__cover-placeholder"><IconTarget /></span>
                  )}
                </div>
                <div className="pj-card__body">
                  {p.period_label && <span className="pj-card__period"><IconCalendar /> {p.period_label}</span>}
                  <h3>{p.title}</h3>
                  {p.description && <p>{p.description}</p>}
                  <div className="pj-card__meta">
                    <span><IconImage /> {p.images.length}</span>
                    <span><IconVideo /> {p.videos.length}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
