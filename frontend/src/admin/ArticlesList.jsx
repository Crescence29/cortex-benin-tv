import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconDoc, IconTrash, IconPlus, IconSearch, IconCheck } from '../components/Icons';

const BRAND_AUTHOR_NAME = 'CORTEX BENIN TV';

const STATUS_LABELS = {
  draft: 'Brouillon',
  pending_review: 'À valider',
  scheduled: 'Programmé',
  published: 'Publié',
};

function StatusBadge({ status }) {
  return (
    <span className={`status-dot status-dot--${status}`}>
      <i />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function ArticlesList() {
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [author, setAuthor] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    api.getCategories({ lang: 'fr' }).then(setCategories);
    api.getUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  function load() {
    setLoading(true);
    const params = {};
    if (category) params.category = category;
    if (status) params.status = status;
    if (author) params.author = author;
    api.adminGetArticles(params).then(setArticles).finally(() => setLoading(false));
  }

  useEffect(load, [category, status, author]);

  const filtered = q
    ? articles.filter((a) => (a.title || '').toLowerCase().includes(q.toLowerCase()))
    : articles;

  async function onDelete(id) {
    if (!confirm('Supprimer cet article et toutes ses traductions ?')) return;
    await api.deleteArticle(id);
    load();
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((a) => a.id))));
  }

  const brandAuthor = users.find((u) => u.name === BRAND_AUTHOR_NAME);

  async function onBulkValidate() {
    if (!bulkCategory) {
      alert('Choisissez la catégorie dans laquelle publier ces articles.');
      return;
    }
    if (!brandAuthor) {
      alert(`Le compte auteur "${BRAND_AUTHOR_NAME}" est introuvable — contactez le développeur.`);
      return;
    }
    if (!confirm(`Valider et publier ${selected.size} article(s) dans "${categories.find((c) => c.slug === bulkCategory)?.name}" avec pour auteur "${BRAND_AUTHOR_NAME}" ?`)) return;
    setValidating(true);
    try {
      const categoryId = categories.find((c) => c.slug === bulkCategory)?.id;
      await Promise.all(
        [...selected].map((id) =>
          api.updateArticle(id, { status: 'published', category_id: categoryId, author_id: brandAuthor.id })
        )
      );
      setSelected(new Set());
      setBulkCategory('');
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setValidating(false);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>{categories.find((c) => c.slug === category)?.name || 'Gestion des articles'}</h1>
          <p className="admin-topbar__subtitle">Le cœur du CMS journalistique</p>
        </div>
        <Link to="/admin/articles/new" className="btn btn--sm"><IconPlus /> Nouvel article</Link>
      </div>

      <div className="admin-panel">
        <div className="filters-bar">
          <div className="filters-bar__search">
            <IconSearch />
            <input
              type="search"
              placeholder="Rechercher..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select value={author} onChange={(e) => setAuthor(e.target.value)}>
            <option value="">Tous les auteurs</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {selected.size > 0 && (
          <div className="bulk-validate-bar">
            <span>{selected.size} article{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</span>
            <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
              <option value="">— Choisir la catégorie de publication —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <span className="bulk-validate-bar__author">Auteur : <strong>{BRAND_AUTHOR_NAME}</strong></span>
            <button type="button" className="btn btn--sm" onClick={onBulkValidate} disabled={validating}>
              <IconCheck /> {validating ? 'Validation…' : 'Valider et publier'}
            </button>
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setSelected(new Set())}>
              Annuler
            </button>
          </div>
        )}

        {!loading && filtered.length === 0 && <div className="admin-empty">Aucun article ne correspond à ces critères.</div>}
        {filtered.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    title="Tout sélectionner"
                  />
                </th>
                <th>Image</th>
                <th>Titre</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Auteur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelected(a.id)} />
                  </td>
                  <td>
                    {a.cover_image ? (
                      <img src={a.cover_image} alt="" className="row-thumb__img" />
                    ) : (
                      <div className="row-thumb__img" />
                    )}
                  </td>
                  <td className="row-thumb__title">{a.title || '(sans titre)'}</td>
                  <td>{a.category_name}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.author_name}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/articles/${a.id}`} title="Éditer"><IconDoc /></Link>
                      <button onClick={() => onDelete(a.id)} title="Supprimer"><IconTrash /></button>
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
