import { useEffect, useState } from 'react';
import { api } from '../api';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function TvGrid() {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    api.getTvSchedule().then(setSchedule);
  }, []);

  return (
    <div className="container section">
      <h1 className="page-title">Grille des programmes</h1>
      {schedule.length === 0 && <p>La grille sera bientôt disponible.</p>}
      {DAYS.map((day, i) => {
        const items = schedule.filter((s) => s.day_of_week === i);
        if (items.length === 0) return null;
        return (
          <div key={i} style={{ marginBottom: 28 }}>
            <h2 className="section__title">{day}</h2>
            <ul className="feed-list">
              {items.map((s) => (
                <li key={s.id}>
                  <span><strong>{s.start_time?.slice(0, 5)}</strong> — {s.title}</span>
                  {s.category_name && <span className="feed-list__source">{s.category_name}</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
