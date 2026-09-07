import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  IconBroadcast,
  IconCalendar,
  IconTv,
  IconBell,
  IconSmartphone,
  IconChevronDown,
  IconPlay,
} from '../components/Icons';
import './live.css';

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function Live() {
  const [live, setLive] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    api.getLive().then(setLive).catch(() => setLive(null));
    api.getTvSchedule().then(setSchedule).catch(() => setSchedule([]));
    api.getArticles({ lang: 'fr', limit: 3 }).then(setLatest).catch(() => setLatest([]));
  }, []);

  const now = new Date();
  const viewedDay = now.getDay();
  const isToday = true;

  const dayItems = useMemo(
    () =>
      schedule
        .filter((s) => s.day_of_week === viewedDay)
        .slice()
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),
    [schedule, viewedDay]
  );

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let currentIndex = -1;
  if (isToday) {
    dayItems.forEach((item, i) => {
      if (timeToMinutes(item.start_time) <= nowMinutes) currentIndex = i;
    });
  }

  const current = currentIndex >= 0 ? dayItems[currentIndex] : null;
  const upcoming = currentIndex >= 0 ? dayItems.slice(currentIndex + 1, currentIndex + 4) : dayItems.slice(0, 3);

  function endLabel(index) {
    const next = dayItems[index + 1];
    return next ? next.start_time?.slice(0, 5) : '—';
  }

  return (
    <div className="ec-page">
      <div className="container ec-breadcrumb">
        <Link to="/">Accueil</Link>
        <span>›</span>
        <span className="ec-breadcrumb__current">En continu</span>
      </div>

      <div className="container ec-header">
        <span className="ec-header__icon"><IconBroadcast /></span>
        <div>
          <h1>EN CONTINU</h1>
          <p>Vos programmes et notre actualité en direct, 24h/24.</p>
        </div>
      </div>

      <div className="container ec-layout">
        <div className="ec-main">
          <div className="ec-player">
            {live?.is_live ? (
              live.stream_url ? (
                <video src={live.stream_url} controls autoPlay className="ec-player__video" />
              ) : (
                <div className="ec-player__placeholder">
                  <span className="ec-player__badge"><span className="dot" /> En direct</span>
                  <IconTv />
                  <p>À l'antenne — flux vidéo non configuré</p>
                </div>
              )
            ) : (
              <div className="ec-player__placeholder ec-player__placeholder--off">
                <IconTv />
                <p>Hors antenne pour le moment</p>
              </div>
            )}
          </div>
          {live?.title && (
            <p className="ec-player__title">{live.is_live ? live.title : 'Prochaine diffusion à suivre'}</p>
          )}

          <div className="ec-features">
            <div className="ec-feature">
              <span className="ec-feature__icon"><IconCalendar /></span>
              <div>
                <h3>24h/24</h3>
                <p>Un flux continu d'informations.</p>
              </div>
            </div>
            <div className="ec-feature">
              <span className="ec-feature__icon"><IconBroadcast /></span>
              <div>
                <h3>Direct</h3>
                <p>Des émissions en direct toute la journée.</p>
              </div>
            </div>
            <div className="ec-feature">
              <span className="ec-feature__icon"><IconSmartphone /></span>
              <div>
                <h3>Tous vos écrans</h3>
                <p>Regardez sur mobile, tablette ou ordinateur.</p>
              </div>
            </div>
            <div className="ec-feature">
              <span className="ec-feature__icon"><IconBell /></span>
              <div>
                <h3>Alertes</h3>
                <p>Recevez une notification pour ne rien manquer.</p>
              </div>
            </div>
          </div>

        </div>

        <aside className="ec-sidebar">
          <div className="ec-current-card">
            <span className="ec-current-card__label"><span className="dot" /> {current ? 'Programme en cours' : 'Programme'}</span>
            {current ? (
              <>
                <h2>{current.title}</h2>
                <p className="ec-current-card__time">{current.start_time?.slice(0, 5)} - {endLabel(currentIndex)}</p>
                {current.category_name && <p className="ec-current-card__cat">{current.category_name}</p>}
              </>
            ) : (
              <p className="ec-current-card__empty">Aucun programme en cours actuellement.</p>
            )}
            <Link to="/direct" className="ec-current-card__btn"><IconPlay /> Regarder en direct</Link>
          </div>

          {upcoming.length > 0 && (
            <div className="ec-upcoming-card">
              <h3>À suivre</h3>
              <ul>
                {upcoming.map((item, i) => {
                  const idx = dayItems.indexOf(item);
                  return (
                    <li key={item.id}>
                      <span className="ec-upcoming-card__time">{item.start_time?.slice(0, 5)} - {endLabel(idx)}</span>
                      <span className="ec-upcoming-card__title">{item.title}</span>
                    </li>
                  );
                })}
              </ul>
              <Link to="/grille-tv" className="ec-upcoming-card__more">Voir la grille TV <IconChevronDown style={{ transform: 'rotate(-90deg)' }} /></Link>
            </div>
          )}

          {latest.length > 0 && (
            <div className="ec-discover-card">
              <h3>À découvrir aussi</h3>
              <ul>
                {latest.map((a) => (
                  <li key={a.id}>
                    <Link to={`/article/${a.slug}`}>{a.title}</Link>
                    <span>{a.category_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
