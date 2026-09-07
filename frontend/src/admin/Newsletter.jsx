import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconTrash, IconRefresh } from '../components/Icons';

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function exportCsv(subscribers) {
  const header = 'email,date_inscription\n';
  const rows = subscribers.map((s) => `${s.email},${s.created_at}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `abonnes-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.adminGetNewsletterSubscribers().then(setSubscribers).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onDelete(id, email) {
    if (!confirm(`Désabonner ${email} ?`)) return;
    await api.adminDeleteNewsletterSubscriber(id);
    load();
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return subscribers;
    const q = query.trim().toLowerCase();
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, query]);

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Newsletter</h1>
          <p className="admin-topbar__subtitle">{subscribers.length} abonné{subscribers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Abonnés</h2>
          <div className="row-actions" style={{ gap: 10 }}>
            <button type="button" className="btn btn--sm btn--outline" onClick={load}>
              <IconRefresh /> Actualiser
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => exportCsv(subscribers)}
              disabled={subscribers.length === 0}
            >
              Exporter en CSV
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <input
            type="search"
            placeholder="Rechercher un email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', maxWidth: 320, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </div>

        {!loading && filtered.length === 0 && (
          <div className="admin-empty">
            {subscribers.length === 0 ? 'Aucun abonné pour le moment.' : 'Aucun résultat pour cette recherche.'}
          </div>
        )}

        {filtered.length > 0 && (
          <table className="data-table" style={{ marginTop: 16 }}>
            <thead>
              <tr><th>Email</th><th>Inscrit le</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{formatDate(s.created_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => onDelete(s.id, s.email)} title="Désabonner"><IconTrash /></button>
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
