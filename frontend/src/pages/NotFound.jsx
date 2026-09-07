import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconSearch, IconPlay } from '../components/Icons';
import './notfound.css';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page introuvable — Cortex Bénin TV';
    return () => {
      document.title = 'Cortex Bénin TV';
    };
  }, []);

  return (
    <div className="nf-page">
      <div className="nf-page__overlay" />
      <div className="container nf-content">
        <span className="nf-code">404</span>
        <h1>Page introuvable</h1>
        <p>Cette page n'existe pas ou a été déplacée. Retournez à l'accueil ou lancez une recherche.</p>
        <div className="nf-actions">
          <Link to="/" className="nf-btn nf-btn--primary">
            <IconPlay /> Retour à l'accueil
          </Link>
          <Link to="/recherche" className="nf-btn nf-btn--outline">
            <IconSearch /> Rechercher
          </Link>
        </div>
      </div>
    </div>
  );
}
