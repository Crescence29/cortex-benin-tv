import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconDoc } from '../components/Icons';

export default function Planning() {
  const [scheduled, setScheduled] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.adminGetArticles({ status: 'scheduled' }),
      api.adminGetArticles({ status: 'pending_review' }),
    ])
      .then(([s, p]) => {
        setScheduled(s.sort((a, b) => new Date(a.published_at) - new Date(b.published_at)));
        setPending(p);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Planning éditorial</h1>
          <p className="admin-topbar__subtitle">Publications programmées et articles en attente de validation</p>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Programmés</h2>
        </div>
        {!loading && scheduled.length === 0 && <div className="admin-empty">Aucun article programmé.</div>}
        {scheduled.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Article</th><th>Catégorie</th><th>Date de publication</th><th></th></tr>
            </thead>
            <tbody>
              {scheduled.map((a) => (
                <tr key={a.id}>
                  <td className="row-thumb__title">{a.title || '(sans titre)'}</td>
                  <td>{a.category_name}</td>
                  <td>{a.published_at ? new Date(a.published_at).toLocaleString() : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/articles/${a.id}`} title="Éditer"><IconDoc /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>En attente de validation</h2>
        </div>
        {!loading && pending.length === 0 && <div className="admin-empty">Rien à valider pour le moment.</div>}
        {pending.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Article</th><th>Catégorie</th><th>Auteur</th><th></th></tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id}>
                  <td className="row-thumb__title">{a.title || '(sans titre)'}</td>
                  <td>{a.category_name}</td>
                  <td>{a.author_name}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/articles/${a.id}`} title="Éditer"><IconDoc /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
