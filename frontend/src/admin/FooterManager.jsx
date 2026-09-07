import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconTrash, IconPlus } from '../components/Icons';

const emptyPartner = { name: '', logo_url: '', website_url: '', bg_color: '#ffffff', sort_order: 0 };
const emptyShow = { name: '', logo_url: '', bg_color: '#ffffff', sort_order: 0, description: '', schedule_label: '', category_id: '' };

function LogoManager({ title, hint, items, load, emptyForm, createFn, updateFn, deleteFn, hasWebsite, hasShowFields, categories }) {
  const [form, setForm] = useState(emptyForm);

  async function onAdd(e) {
    e.preventDefault();
    await createFn(form);
    setForm(emptyForm);
    load();
  }

  async function onToggleActive(item) {
    await updateFn(item.id, { is_active: !item.is_active });
    load();
  }

  async function onDelete(id) {
    if (!confirm('Supprimer ce logo ?')) return;
    await deleteFn(id);
    load();
  }

  return (
    <div className="admin-panel" style={{ marginBottom: 24 }}>
      <div className="admin-panel__header">
        <h2>{title}</h2>
      </div>
      <form onSubmit={onAdd} className="admin-form" style={{ boxShadow: 'none', margin: 20 }}>
        <p className="admin-topbar__subtitle" style={{ margin: 0 }}>{hint}</p>
        <label>
          Nom
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          URL du logo {hasShowFields ? '(optionnel — le nom s\'affiche en attendant)' : '(ex. /partenaires/mon-logo.png)'}
          <input
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            placeholder={hasShowFields ? '/emissions/mon-logo.png' : undefined}
            required={!hasShowFields}
          />
        </label>
        {hasWebsite && (
          <label>
            Site web (optionnel)
            <input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." />
          </label>
        )}
        {hasShowFields && (
          <>
            <label>
              Description courte (optionnel)
              <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="L'émission qui donne la parole aux experts..." />
            </label>
            <label>
              Horaire (optionnel)
              <input value={form.schedule_label || ''} onChange={(e) => setForm({ ...form, schedule_label: e.target.value })} placeholder="Mercredi 20:00" />
            </label>
            <label>
              Catégorie (optionnel)
              <select value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
                <option value="">—</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Fond de la carte
          <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} style={{ width: 60 }} />
        </label>
        <label>
          Ordre d'affichage
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </label>
        <button type="submit" className="btn"><IconPlus /> Ajouter</button>
      </form>

      {items.length === 0 && <div className="admin-empty">Aucun logo pour le moment.</div>}
      {items.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Logo</th><th>Nom</th>
              {hasShowFields && <th>Horaire</th>}
              <th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ background: item.logo_url ? item.bg_color : '#1a1a1a', display: 'inline-flex', padding: 6, borderRadius: 4, minWidth: 40, justifyContent: 'center' }}>
                    {item.logo_url ? (
                      <img src={item.logo_url} alt={item.name} style={{ height: 28, width: 'auto' }} />
                    ) : (
                      <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 0' }}>Texte</span>
                    )}
                  </div>
                </td>
                <td>{item.name}</td>
                {hasShowFields && <td>{item.schedule_label || '—'}</td>}
                <td>
                  <button type="button" className="link-btn" onClick={() => onToggleActive(item)}>
                    {item.is_active ? 'Visible' : 'Masqué'}
                  </button>
                </td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => onDelete(item.id)} title="Supprimer"><IconTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function FooterManager() {
  const [partners, setPartners] = useState([]);
  const [shows, setShows] = useState([]);
  const [categories, setCategories] = useState([]);

  function loadPartners() {
    api.adminGetPartners().then(setPartners);
  }
  function loadShows() {
    api.adminGetShows().then(setShows);
  }

  useEffect(() => {
    loadPartners();
    loadShows();
    api.getCategories({ lang: 'fr' }).then(setCategories).catch(() => setCategories([]));
  }, []);

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Footer</h1>
          <p className="admin-topbar__subtitle">Logos des partenaires et des émissions affichés en bas du site</p>
        </div>
      </div>

      <LogoManager
        title="Nos émissions"
        hint="Déposez d'abord le fichier dans frontend/public/emissions/, puis indiquez son chemin ici."
        items={shows}
        load={loadShows}
        emptyForm={emptyShow}
        createFn={api.createShow}
        updateFn={api.updateShow}
        deleteFn={api.deleteShow}
        hasWebsite={false}
        hasShowFields
        categories={categories}
      />

      <LogoManager
        title="Nos partenaires"
        hint="Déposez d'abord le fichier dans frontend/public/partenaires/, puis indiquez son chemin ici."
        items={partners}
        load={loadPartners}
        emptyForm={emptyPartner}
        createFn={api.createPartner}
        updateFn={api.updatePartner}
        deleteFn={api.deletePartner}
        hasWebsite
      />
    </AdminLayout>
  );
}
