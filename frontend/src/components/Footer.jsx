import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api';
import { IconFacebook, IconWhatsApp, IconYoutube, IconTikTok, IconLinkedIn } from './Icons';
import Logo from './Logo';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

const PRESTATIONS = [
  'Podcast',
  'Photographie',
  'Reportages',
  'Documentaires',
  'Communication',
  'Consultation audiovisuel',
  'Live sur les réseaux sociaux',
  'Développement de solutions numériques',
  'Conception de solutions visuelles',
];

const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://www.facebook.com/cortexbenintv', icon: IconFacebook },
  { label: 'WhatsApp', href: 'https://whatsapp.com/channel/0029VanTjhu05MUXjsn0l51S', icon: IconWhatsApp },
  { label: 'YouTube', href: 'https://youtube.com/@cortexbenintv', icon: IconYoutube },
  { label: 'TikTok', href: 'https://vm.tiktok.com/ZS9Brm9XQDjB7-TbCqm/', icon: IconTikTok },
];

const RUBRIQUES = [
  { label: 'Local', to: '/rubrique/local' },
  { label: 'International', to: '/rubrique/international' },
  { label: 'Culture', to: '/rubrique/culture' },
  { label: 'Émission', to: '/rubrique/emission' },
  { label: 'Musique', to: '/rubrique/musique' },
  { label: 'Sports', to: '/rubrique/sports' },
  { label: 'Podcasts', to: '/rubrique/podcasts' },
  { label: 'Jeunesse', to: '/rubrique/jeunesse' },
];

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await api.subscribeNewsletter(email);
      setStatus(res.alreadySubscribed ? 'Déjà abonné.' : 'Merci, inscription confirmée !');
      setEmail('');
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="footer-newsletter">
      <input
        type="email"
        required
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">S'abonner</button>
      {status && <p className="footer-newsletter__status">{status}</p>}
    </form>
  );
}

export default function Footer() {
  const { t } = useLanguage();
  const [partners, setPartners] = useState([]);
  const [shows, setShows] = useState([]);

  useEffect(() => {
    api.getPartners().then(setPartners).catch(() => setPartners([]));
    api.getShows().then(setShows).catch(() => setShows([]));
  }, []);

  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <Link to="/" className="footer-logo">
          <Logo imgAlt="Cortex Bénin TV" textClassName="brand-text-logo--footer" />
        </Link>
        <div className="footer-social">
          {SOCIAL_LINKS.map((s) => {
            const Icon = s.icon;
            return (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="footer-social__link" title={s.label}>
                <Icon />
              </a>
            );
          })}
          <span className="footer-social__link footer-social__link--soon" title="LinkedIn (bientôt disponible)">
            <IconLinkedIn />
          </span>
        </div>
      </div>

      <div className="container footer-grid">
        <div className="footer-col">
          <h3>Nos rubriques</h3>
          <div className="footer-links-grid">
            {RUBRIQUES.map((r) => (
              <Link key={r.to} to={r.to}>{r.label}</Link>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h3>À propos</h3>
          <Link to="/a-propos">Qui sommes-nous ?</Link>
          <Link to="/contact">Nous contacter</Link>
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </div>

        <div className="footer-col">
          <h3>Accès rapide</h3>
          <Link to="/direct">En direct</Link>
          <Link to="/videos">Vidéos</Link>
          <Link to="/grille-tv">Grille des programmes</Link>
          <Link to="/recherche">Recherche</Link>
        </div>

        <div className="footer-col" id="services">
          <h3>Services</h3>
          <ul className="footer-prestations">
            {PRESTATIONS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h3>Newsletter</h3>
          <NewsletterForm />
          <a href={`${API_ORIGIN}/rss.xml`} target="_blank" rel="noopener noreferrer" style={{ marginTop: 14, display: 'inline-block' }}>
            Flux RSS
          </a>
          <Link to="/desabonnement" style={{ marginTop: 8, display: 'inline-block', fontSize: '0.78rem' }}>
            Se désabonner
          </Link>
        </div>
      </div>

      <div className="footer-partners">
        <div className="container footer-partners__split">
          <div className="footer-partners__side">
            <span className="footer-partners__label">Nos émissions</span>
            <div className="footer-partners__logos">
              {shows.length > 0 ? (
                shows.map((e) => (
                  <span key={e.id} title={e.name} style={{ background: e.logo_url ? e.bg_color : undefined }}>
                    {e.logo_url ? <img src={e.logo_url} alt={e.name} /> : <span className="footer-partners__text-badge">{e.name}</span>}
                  </span>
                ))
              ) : (
                <p className="footer-partners__empty">Espace réservé — logos à venir.</p>
              )}
            </div>
          </div>

          <div className="footer-partners__side footer-partners__side--right">
            <span className="footer-partners__label">Nos partenaires</span>
            <div className="footer-partners__logos">
              {partners.length > 0 ? (
                partners.map((p) =>
                  p.website_url ? (
                    <a key={p.id} href={p.website_url} target="_blank" rel="noopener noreferrer" title={p.name} style={{ background: p.bg_color }}>
                      <img src={p.logo_url} alt={p.name} />
                    </a>
                  ) : (
                    <span key={p.id} title={p.name} style={{ background: p.bg_color }}>
                      <img src={p.logo_url} alt={p.name} />
                    </span>
                  )
                )
              ) : (
                <p className="footer-partners__empty">Espace réservé — logos à venir.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <Link to="/mentions-legales">Mentions légales</Link>
        <Link to="/confidentialite">Confidentialité</Link>
        <Link to="/confidentialite">Cookies</Link>
      </div>

      <div className="container footer-copyright">
        <p>© {new Date().getFullYear()} Cortex Bénin TV — {t('footer_droits')}</p>
        <p className="site-footer__muted">{t('footer_tagline')}</p>
      </div>
    </footer>
  );
}
