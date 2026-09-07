import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconTrash, IconRss } from '../components/Icons';

export default function FeedSources() {
  const [sources, setSources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', url: '', category_id: '' });
  const [status, setStatus] = useState(null);

  function load() {
    api.getFeedSources().then(setSources).catch(() => {});
  }

  useEffect(() => {
    load();
    api.getCategories({ lang: 'fr' }).then(setCategories);
  }, []);

  async function onAdd(e) {
    e.preventDefault();
    await api.createFeedSource(form);
    setForm({ name: '', url: '', category_id: '' });
    load();
  }

  async function onDelete(id) {
    await api.deleteFeedSource(id);
    load();
  }

  async function onRefresh() {
    setStatus('Rafraîchissement…');
    const result = await api.refreshFeeds();
    setStatus(`${result.newItems} nouveaux articles récupérés sur ${result.sourcesChecked} sources.`);
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Sources RSS</h1>
          <p className="admin-topbar__subtitle">
            <Link to="/admin">← Retour au tableau de bord</Link>
          </p>
        </div>
        <button className="btn btn--sm btn--outline" onClick={onRefresh} type="button">
          <IconRss /> Rafraîchir maintenant
        </button>
      </div>

      {status && <p className="admin-topbar__subtitle">{status}</p>}

      <form onSubmit={onAdd} className="admin-form" style={{ marginBottom: 24 }}>
        <label>
          Nom de la source
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          URL du flux RSS
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
        </label>
        <label>
          Catégorie
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">— Aucune —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn">Ajouter la source</button>
      </form>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Sources actives</h2>
        </div>
        {sources.length === 0 && <div className="admin-empty">Aucune source configurée.</div>}
        {sources.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Nom</th><th>URL</th><th>Dernière récupération</th><th></th></tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.url}</td>
                  <td>{s.last_fetched_at ? new Date(s.last_fetched_at).toLocaleString() : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => onDelete(s.id)} title="Supprimer"><IconTrash /></button>
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
