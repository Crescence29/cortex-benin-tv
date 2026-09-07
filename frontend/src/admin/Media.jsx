import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';

export default function Media() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.getMedia().then(setItems);
  }, []);

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Médiathèque</h1>
          <p className="admin-topbar__subtitle">Toutes les images utilisées sur le site ({items.length})</p>
        </div>
      </div>

      {items.length === 0 && <div className="admin-empty">Aucune image utilisée pour le moment.</div>}

      <div className="media-grid">
        {items.map((item, i) => (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="media-card">
            <img src={item.url} alt={item.title} loading="lazy" />
            <div className="media-card__meta">
              <span className="media-card__title">{item.title}</span>
              <span className="media-card__source">{item.source}</span>
            </div>
          </a>
        ))}
      </div>
    </AdminLayout>
  );
}
