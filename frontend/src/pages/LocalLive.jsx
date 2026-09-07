import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  IconMapPin,
  IconBroadcast,
  IconVideo,
  IconBell,
  IconTv,
  IconPlay,
  IconCalendar,
} from '../components/Icons';
import './locallive.css';

const COMMUNES = ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Ouidah', 'Natitingou', 'Kandi'];
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const REPORTAGES = [
  { file: "24h pour l'Info christelle.mp4", title: "24h pour l'Info" },
  { file: 'Centre de Formation Max Coiffure Tresse et Esthétique-_1.mp4', title: 'Centre de Formation Max Coiffure, Tresse et Esthétique' },
  { file: 'DON RCCF.mp4', title: 'Don RCCF' },
  { file: 'DON RCCF_1.mp4', title: 'Don RCCF' },
  { file: 'DURAGIRE BOHICON.mp4', title: 'Duragiré Bohicon' },
  { file: 'FACA 2023.mp4', title: 'FACA 2023' },
  { file: "HANDICAP' ACTIVES_1.mp4", title: 'Handicap Actives' },
].map((v) => ({ ...v, src: `/vidéo/24H/${encodeURIComponent(v.file)}` }));

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function LocalLive() {
  const [live, setLive] = useState(null);
  const [items, setItems] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [dayOffset, setDayOffset] = useState(0);

  useEffect(() => {
    api.getLive('local').then(setLive).catch(() => setLive(null));
    api.getArticles({ lang: 'fr', category: 'local', limit: 8 }).then(setItems).catch(() => setItems([]));
    api.getTvSchedule().then(setSchedule).catch(() => setSchedule([]));
  }, []);

  const now = new Date();
  const viewedDay = (now.getDay() + dayOffset + 7) % 7;
  const isToday = dayOffset === 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dayItems = useMemo(
    () =>
      schedule
        .filter((s) => s.day_of_week === viewedDay)
        .slice()
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),
    [schedule, viewedDay]
  );

  let currentIndex = -1;
  if (isToday) {
    dayItems.forEach((item, i) => {
      if (timeToMinutes(item.start_time) <= nowMinutes) currentIndex = i;
    });
  }

  return (
    <div className="ll-page">
      <div className="container ll-breadcrumb">
        <Link to="/">Accueil</Link>
        <span>›</span>
        <span className="ll-breadcrumb__current">En direct local</span>
      </div>

      <div className="container ll-header">
        <span className="ll-header__kicker"><IconMapPin /> En direct local</span>
        <h1>LE BÉNIN EN DIRECT</h1>
        <p>Vos villes, vos réalités, en temps réel.</p>
      </div>

      <div className="container ll-player">
        {live?.is_live ? (
          live.stream_url ? (
            <video src={live.stream_url} controls autoPlay className="ll-player__video" />
          ) : (
            <div className="ll-player__placeholder">
              <span className="ll-player__badge"><span className="dot" /> En direct</span>
              <IconTv />
              <p>{live.title || 'Cortex Bénin TV'}</p>
            </div>
          )
        ) : (
          <div className="ll-player__placeholder ll-player__placeholder--off">
            <IconTv />
            <p>Hors antenne pour le moment</p>
          </div>
        )}
      </div>

      <div className="container ll-features">
        <div className="ll-feature">
          <span className="ll-feature__icon"><IconBroadcast /></span>
          <div>
            <h3>En direct 24h/24</h3>
            <p>Vos villes en temps réel.</p>
          </div>
        </div>
        <div className="ll-feature">
          <span className="ll-feature__icon"><IconMapPin /></span>
          <div>
            <h3>Couverture locale</h3>
            <p>Au cœur de vos communautés.</p>
          </div>
        </div>
        <div className="ll-feature">
          <span className="ll-feature__icon"><IconVideo /></span>
          <div>
            <h3>Reportages</h3>
            <p>Événements, faits, réactions.</p>
          </div>
        </div>
        <div className="ll-feature">
          <span className="ll-feature__icon"><IconBell /></span>
          <div>
            <h3>Alertes locales</h3>
            <p>Infos urgentes de vos régions.</p>
          </div>
        </div>
      </div>

      <div className="container ll-schedule-card">
        <div className="ll-schedule-card__header">
          <span className="ll-schedule-card__icon"><IconCalendar /></span>
          <h2>Programme de la journée</h2>
        </div>
        <div className="ll-schedule-card__nav">
          <button onClick={() => setDayOffset((d) => d - 1)} aria-label="Jour précédent">‹</button>
          <span>{isToday ? "Aujourd'hui" : DAYS[viewedDay]}</span>
          <button onClick={() => setDayOffset((d) => d + 1)} aria-label="Jour suivant">›</button>
        </div>
        {dayItems.length === 0 ? (
          <p className="ll-schedule-card__empty">Aucun programme renseigné pour ce jour.</p>
        ) : (
          <ul className="ll-schedule-list">
            {dayItems.map((item, i) => (
              <li key={item.id} className={i === currentIndex ? 'is-current' : ''}>
                <span className="ll-schedule-list__time">{item.start_time?.slice(0, 5)}</span>
                <div>
                  <span className="ll-schedule-list__title">{item.title}</span>
                  {item.category_name && <span className="ll-schedule-list__cat">{item.category_name}</span>}
                </div>
                {i === currentIndex && <span className="ll-schedule-list__live">En direct</span>}
              </li>
            ))}
          </ul>
        )}
        <Link to="/grille-tv" className="ll-schedule-card__more">Voir la grille TV →</Link>
      </div>

      <div className="container ll-section">
        <div className="ll-section__header">
          <h2>Reportages</h2>
        </div>
        <div className="ll-videos">
          {REPORTAGES.map((v) => (
            <div className="ll-video-card" key={v.file}>
              <video src={v.src} controls preload="metadata" className="ll-video-card__media" />
              <span className="ll-video-card__title">{v.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="container ll-section">
        <div className="ll-section__header">
          <h2>Actualités locales</h2>
          <Link to="/rubrique/local">Voir tout →</Link>
        </div>
        {items.length === 0 ? (
          <p className="ll-empty">Aucun article local disponible pour le moment.</p>
        ) : (
          <div className="ll-grid">
            {items.map((a) => (
              <Link to={`/article/${a.slug}`} key={a.id} className="ll-card">
                <div className="ll-card__media">
                  {a.cover_image ? <img src={a.cover_image} alt={a.title} /> : <div className="ll-card__placeholder" />}
                </div>
                <div className="ll-card__body">
                  <h3>{a.title}</h3>
                  <span>{formatDate(a.published_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="container ll-section">
        <div className="ll-section__header">
          <h2>Nos villes couvertes</h2>
        </div>
        <div className="ll-communes">
          {COMMUNES.map((c) => (
            <Link to="/rubrique/local" key={c} className="ll-commune-card">
              <IconMapPin />
              <span>{c}</span>
            </Link>
          ))}
        </div>
      </div>

      <SubscribeBand />
    </div>
  );
}

function SubscribeBand() {
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
    <div className="container ll-subscribe">
      <div className="ll-subscribe__intro">
        <span className="ll-subscribe__icon"><IconPlay /></span>
        <div>
          <h3>Restez connecté à votre ville</h3>
          <p>Recevez les alertes et les temps forts de votre localité.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="ll-subscribe__form">
        <input type="email" required placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">S'abonner</button>
      </form>
      {status && <p className="ll-subscribe__status">{status}</p>}
    </div>
  );
}
