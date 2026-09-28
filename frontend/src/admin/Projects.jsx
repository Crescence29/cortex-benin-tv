import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconTrash, IconPlus, IconPencil, IconImage, IconVideo } from '../components/Icons';

const emptyForm = {
  title: '',
  description: '',
  period_label: '',
  cover_image_url: '',
  is_published: true,
  sort_order: 0,
  images: [],
  videos: [],
};

function RepeatableUrlList({ label, icon: Icon, items, urlKey, labelKey, urlPlaceholder, labelPlaceholder, onChange }) {
  function updateItem(i, field, value) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }
  function addItem() {
    onChange([...items, { [urlKey]: '', [labelKey]: '' }]);
  }
  function removeItem(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="project-repeatable">
      <div className="project-repeatable__header">
        <span><Icon /> {label}</span>
        <button type="button" className="btn btn--sm btn--outline" onClick={addItem}>
          <IconPlus /> Ajouter
        </button>
      </div>
      {items.length === 0 && <p className="admin-empty" style={{ padding: '8px 0' }}>Aucun élément pour le moment.</p>}
      {items.map((item, i) => (
        <div className="project-repeatable__row" key={i}>
          <input
            value={item[urlKey] || ''}
            onChange={(e) => updateItem(i, urlKey, e.target.value)}
            placeholder={urlPlaceholder}
            required
          />
          <input
            value={item[labelKey] || ''}
            onChange={(e) => updateItem(i, labelKey, e.target.value)}
            placeholder={labelPlaceholder}
          />
          <button type="button" className="btn btn--sm btn--outline btn--danger" onClick={() => removeItem(i)} title="Retirer">
            <IconTrash />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Projects() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.adminGetProjects().then(setItems);
  }

  useEffect(load, []);

  function onEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      period_label: item.period_label || '',
      cover_image_url: item.cover_image_url || '',
      is_published: !!item.is_published,
      sort_order: item.sort_order,
      images: item.images.map((i) => ({ image_url: i.image_url, caption: i.caption || '' })),
      videos: item.videos.map((v) => ({ video_url: v.video_url, title: v.title || '' })),
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
    setSaving(true);
    try {
      if (editingId) {
        await api.updateProject(editingId, form);
      } else {
        await api.createProject(form);
      }
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePublished(item) {
    await api.updateProject(item.id, { is_published: !item.is_published });
    load();
  }

  async function onDelete(id) {
    if (!confirm('Supprimer ce projet ainsi que ses affiches et vidéos associées ?')) return;
    if (editingId === id) onCancelEdit();
    await api.deleteProject(id);
    load();
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Projets</h1>
          <p className="admin-topbar__subtitle">Campagnes et projets spéciaux (ex: Octobre Rose, Novembre Bleu) avec leurs affiches, flyers et vidéos</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="admin-form" style={{ marginBottom: 24 }}>
        {error && <p className="admin-form__error">{error}</p>}
        <label>
          Titre
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Octobre Rose 2026" />
        </label>
        <label>
          Période (optionnel)
          <input value={form.period_label} onChange={(e) => setForm({ ...form, period_label: e.target.value })} placeholder="Octobre 2026" />
        </label>
        <label>
          Description (optionnel)
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={10}
            placeholder={"C'est quoi ce projet ?\n\nQuel est l'objectif ?\n\nDepuis quand existe-t-il ?\n\nQue doit-on faire / comment participer ?"}
          />
          <span className="admin-form__hint">
            Texte libre. Laissez une ligne vide entre les paragraphes (ex: "C'est quoi", "Objectif", "Depuis quand", "Que faire") — les sauts de ligne sont conservés tels quels sur la page publique.
          </span>
        </label>
        <label>
          Image de couverture (optionnel)
          <input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
        </label>
        <label>
          Ordre d'affichage
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </label>

        <RepeatableUrlList
          label="Affiches / Flyers"
          icon={IconImage}
          items={form.images}
          urlKey="image_url"
          labelKey="caption"
          urlPlaceholder="https://... (image)"
          labelPlaceholder="Légende (optionnel)"
          onChange={(images) => setForm({ ...form, images })}
        />

        <RepeatableUrlList
          label="Vidéos réalisées"
          icon={IconVideo}
          items={form.videos}
          urlKey="video_url"
          labelKey="title"
          urlPlaceholder="https://... (vidéo)"
          labelPlaceholder="Titre (optionnel)"
          onChange={(videos) => setForm({ ...form, videos })}
        />

        <label className="admin-form__checkbox">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
          Publié (visible sur le site)
        </label>

        <div className="row-actions" style={{ gap: 10 }}>
          <button type="submit" className="btn" disabled={saving}>
            {editingId ? (<><IconPencil /> Enregistrer les modifications</>) : (<><IconPlus /> Créer le projet</>)}
          </button>
          {editingId && (
            <button type="button" className="btn btn--outline" onClick={onCancelEdit}>Annuler</button>
          )}
        </div>
      </form>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Projets ({items.length})</h2>
        </div>
        {items.length === 0 && <div className="admin-empty">Aucun projet pour le moment.</div>}
        {items.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>Titre</th><th>Période</th><th>Affiches</th><th>Vidéos</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={editingId === p.id ? { background: 'var(--bg)' } : undefined}>
                  <td className="row-thumb__title">{p.title}</td>
                  <td>{p.period_label || '—'}</td>
                  <td>{p.images.length}</td>
                  <td>{p.videos.length}</td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => onTogglePublished(p)}>
                      <span className={`status-dot status-dot--${p.is_published ? 'published' : 'draft'}`}>
                        <i /> {p.is_published ? 'Publié' : 'Masqué'}
                      </span>
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => onEdit(p)} title="Modifier"><IconPencil /></button>
                      <button onClick={() => onDelete(p.id)} title="Supprimer"><IconTrash /></button>
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
