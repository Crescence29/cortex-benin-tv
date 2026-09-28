import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { IconCalendar, IconImage, IconVideo } from '../components/Icons';
import './projects.css';

// Un lien de vidéo est joué directement (comme le reste du site, qui n'a
// pas de système d'intégration YouTube/Facebook) s'il ressemble à un
// fichier vidéo ; sinon on propose un simple lien externe plutôt que
// d'afficher un lecteur cassé.
const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

export default function ProjectDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState(undefined);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setProject(undefined);
    window.scrollTo(0, 0);
    api.getProject(slug).then(setProject).catch(() => setProject(null));
  }, [slug]);

  if (project === undefined) return <div className="pj-page pj-loading">Chargement…</div>;
  if (!project) {
    return (
      <div className="pj-page pj-loading">
        <p>Projet introuvable.</p>
        <Link to="/projets">← Retour aux projets</Link>
      </div>
    );
  }

  return (
    <div className="pj-page">
      <section className="pj-hero pj-hero--detail">
        <div className="pj-hero__overlay" />
        <div className="container pj-breadcrumb">
          <Link to="/">Accueil</Link>
          <span>›</span>
          <Link to="/projets">Projets</Link>
          <span>›</span>
          <span className="pj-breadcrumb__current">{project.title}</span>
        </div>
        <div className="container pj-detail-header">
          {project.period_label && <span className="pj-detail-header__period"><IconCalendar /> {project.period_label}</span>}
          <h1>{project.title}</h1>
          {project.description && <p>{project.description}</p>}
        </div>
      </section>

      <div className="container pj-section">
        {project.images.length > 0 && (
          <div className="pj-block">
            <h2><IconImage /> Affiches & flyers</h2>
            <div className="pj-gallery">
              {project.images.map((img) => (
                <button type="button" className="pj-gallery__item" key={img.id} onClick={() => setLightbox(img)}>
                  <img src={img.image_url} alt={img.caption || project.title} />
                  {img.caption && <span className="pj-gallery__caption">{img.caption}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {project.videos.length > 0 && (
          <div className="pj-block">
            <h2><IconVideo /> Vidéos réalisées</h2>
            <div className="pj-videos">
              {project.videos.map((v) => (
                <div className="pj-video" key={v.id}>
                  {v.title && <h3>{v.title}</h3>}
                  {DIRECT_VIDEO_PATTERN.test(v.video_url) ? (
                    <video src={v.video_url} controls />
                  ) : (
                    <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="pj-video__link">
                      <IconVideo /> Regarder la vidéo
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {project.images.length === 0 && project.videos.length === 0 && (
          <p className="pj-empty">Aucune affiche ni vidéo n'a encore été ajoutée pour ce projet.</p>
        )}
      </div>

      {lightbox && (
        <div className="pj-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox.image_url} alt={lightbox.caption || project.title} />
          {lightbox.caption && <p>{lightbox.caption}</p>}
        </div>
      )}
    </div>
  );
}
