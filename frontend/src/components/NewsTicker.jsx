import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const DAY_INDEX = new Date().getDay();

export default function NewsTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getArticles({ lang: 'fr', limit: 8 }).catch(() => []),
      api.getTvSchedule().catch(() => []),
      api.getAnnouncements().catch(() => []),
    ]).then(([articles, schedule, announcements]) => {
      const announcementItems = announcements.map((a) => ({
        type: 'Annonce',
        label: a.message,
        to: a.link_url || null,
        external: !!a.link_url,
      }));
      const newsItems = articles.map((a) => ({
        type: 'Actu',
        label: a.title,
        to: `/article/${a.slug}`,
      }));
      const todayPrograms = schedule
        .filter((s) => s.day_of_week === DAY_INDEX)
        .map((s) => ({
          type: 'Programme',
          label: `${s.start_time?.slice(0, 5)} — ${s.title}`,
          to: '/grille-tv',
        }));
      setItems([...announcementItems, ...newsItems, ...todayPrograms]);
    });
  }, []);

  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div className="news-ticker">
      <span className="news-ticker__label">EN CE MOMENT</span>
      <div className="news-ticker__track-wrap">
        <div className="news-ticker__track">
          {loop.map((item, i) =>
            !item.to ? (
              <span key={i} className="news-ticker__item">
                <span className="news-ticker__tag">{item.type}</span>
                {item.label}
              </span>
            ) : item.external ? (
              <a key={i} href={item.to} target="_blank" rel="noopener noreferrer" className="news-ticker__item">
                <span className="news-ticker__tag">{item.type}</span>
                {item.label}
              </a>
            ) : (
              <Link key={i} to={item.to} className="news-ticker__item">
                <span className="news-ticker__tag">{item.type}</span>
                {item.label}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
