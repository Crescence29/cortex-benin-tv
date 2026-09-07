import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconTrash, IconPlus, IconPencil, IconLink } from '../components/Icons';

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowPlus(hours) {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  return toDatetimeLocal(d);
}

const emptyForm = { message: '', link_url: '', starts_at: nowPlus(0), ends_at: nowPlus(24) };

function statusOf(a) {
  const now = new Date();
  const start = new Date(a.starts_at);
  const end = new Date(a.ends_at);
  if (!a.is_active) return { label: 'Désactivée', cls: 'draft' };
  if (now < start) return { label: 'Programmée', cls: 'scheduled' };
  if (now > end) return { label: 'Terminée', cls: 'draft' };
  return { label: 'En cours', cls: 'published' };
}

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    api.adminGetAnnouncements().then(setItems);
  }

  useEffect(load, []);

  function onEdit(item) {
    setEditingId(item.id);
    setForm({
      message: item.message,
      link_url: item.link_url || '',
      starts_at: toDatetimeLocal(item.starts_at),
      ends_at: toDatetimeLocal(item.ends_at),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api.updateAnnouncement(editingId, form);
      } else {
        await api.createAnnouncement(form);
      }
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onToggle(item) {
    await api.updateAnnouncement(item.id, { is_active: !item.is_active });
    load();
  }

  async function onDelete(id) {
    if (!confirm('Supprimer cette annonce ?')) return;
    if (editingId === id) onCancelEdit();
    await api.deleteAnnouncement(id);
    load();
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Annonces</h1>
          <p className="admin-topbar__subtitle">Messages diffusés dans la bande défilante "EN CE MOMENT", sur une période programmée</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="admin-form" style={{ marginBottom: 24 }}>
        {error && <p className="admin-form__error">{error}</p>}
        <label>
          Message
          <input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={300} />
        </label>
        <label>
          Lien (optionnel)
          <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
        </label>
        <label>
          Début de diffusion
          <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required />
        </label>
        <label>
          Fin de diffusion
          <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} required />
        </label>
        <div className="row-actions" style={{ gap: 10 }}>
          <button type="submit" className="btn">
            {editingId ? (<><IconPencil /> Enregistrer les modifications</>) : (<><IconPlus /> Programmer l'annonce</>)}
          </button>
          {editingId && (
            <button type="button" className="btn btn--outline" onClick={onCancelEdit}>Annuler</button>
          )}
        </div>
      </form>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Annonces ({items.length})</h2>
        </div>
        {items.length === 0 && <div className="admin-empty">Aucune annonce programmée.</div>}
        {items.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Message</th><th>Lien</th><th>Diffusion</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const s = statusOf(a);
                return (
                  <tr key={a.id} style={editingId === a.id ? { background: 'var(--bg)' } : undefined}>
                    <td className="row-thumb__title">{a.message}</td>
                    <td>
                      {a.link_url ? (
                        <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="link-btn" title={a.link_url}>
                          <IconLink /> Lien
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>{new Date(a.starts_at).toLocaleString()} → {new Date(a.ends_at).toLocaleString()}</td>
                    <td>
                      <button type="button" className="link-btn" onClick={() => onToggle(a)}>
                        <span className={`status-dot status-dot--${s.cls}`}><i /> {s.label}</span>
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => onEdit(a)} title="Modifier"><IconPencil /></button>
                        <button onClick={() => onDelete(a.id)} title="Supprimer"><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
