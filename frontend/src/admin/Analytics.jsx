import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconDoc, IconVideo, IconEye, IconBarChart } from '../components/Icons';

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon"><Icon /></div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getAnalytics().then(setData);
  }, []);

  if (!data) {
    return (
      <AdminLayout>
        <div className="admin-topbar"><h1>Analytics</h1></div>
        <div className="admin-empty">Chargement…</div>
      </AdminLayout>
    );
  }

  const totalViews = data.articles.views + data.videos.views;

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Analytics</h1>
          <p className="admin-topbar__subtitle">Basé sur les consultations réelles enregistrées depuis la mise en place du compteur</p>
        </div>
      </div>

      <div className="stat-cards">
        <StatCard icon={IconEye} value={totalViews} label="Vues totales" />
        <StatCard icon={IconDoc} value={data.articles.views} label="Vues sur les articles" />
        <StatCard icon={IconVideo} value={data.videos.views} label="Vues sur les vidéos" />
        <StatCard icon={IconBarChart} value={`${data.articles.published}/${data.articles.total}`} label="Articles publiés" />
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Articles les plus consultés</h2>
        </div>
        {data.topArticles.length === 0 && <div className="admin-empty">Pas encore de données de consultation.</div>}
        {data.topArticles.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Article</th><th>Vues</th></tr>
            </thead>
            <tbody>
              {data.topArticles.map((a) => (
                <tr key={a.id}>
                  <td className="row-thumb__title">{a.title || '(sans titre)'}</td>
                  <td>{a.view_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Vues par catégorie</h2>
        </div>
        {data.viewsByCategory.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Catégorie</th><th>Vues</th></tr>
            </thead>
            <tbody>
              {data.viewsByCategory.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.views || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
