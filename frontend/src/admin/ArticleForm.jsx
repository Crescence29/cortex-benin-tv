import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from './AuthContext';
import RichTextEditor from './RichTextEditor';
import { IconChevronDown } from '../components/Icons';
import './editor.css';

const STATUS_LABELS = {
  draft: 'Brouillon',
  pending_review: 'À valider',
  scheduled: 'Programmé',
  published: 'Publié',
};

const emptyBase = {
  category_id: '',
  cover_image: '',
  video_url: '',
  status: 'draft',
  is_featured: false,
  author_id: '',
  scheduled_at: '',
};
const emptyTranslation = { title: '', excerpt: '', content: '', seo_title: '', seo_description: '' };

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ArticleForm() {
  const { id } = useParams();
  const isEdit = id && id !== 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [allLanguages, setAllLanguages] = useState([]);
  const [base, setBase] = useState(emptyBase);
  const [tagsInput, setTagsInput] = useState('');
  const [galleryInput, setGalleryInput] = useState('');
  const [translations, setTranslations] = useState({});
  const [activeLang, setActiveLang] = useState('fr');
  const [openPanel, setOpenPanel] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getCategories({ lang: 'fr' }).then(setCategories);
    api.getUsers().then(setUsers).catch(() => setUsers([]));
    api.getLanguages().then(setAllLanguages).catch(() => setAllLanguages([{ code: 'fr', native_name: 'Français' }]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.adminGetArticle(id).then((a) => {
      setBase({
        category_id: a.category_id,
        cover_image: a.cover_image || '',
        video_url: a.video_url || '',
        status: a.status,
        is_featured: !!a.is_featured,
        author_id: a.author_id,
        scheduled_at: toDatetimeLocal(a.published_at),
      });
      setTagsInput((a.tags || []).join(', '));
      setGalleryInput((a.gallery || []).join('\n'));
      const normalized = {};
      for (const [lang, tr] of Object.entries(a.translations)) {
        normalized[lang] = {
          title: tr.title || '',
          excerpt: tr.excerpt || '',
          content: tr.content || '',
          seo_title: tr.seo_title || '',
          seo_description: tr.seo_description || '',
        };
      }
      setTranslations(normalized);
      const firstLang = Object.keys(a.translations)[0];
      if (firstLang) setActiveLang(firstLang);
    });
  }, [id, isEdit]);

  const current = translations[activeLang] || emptyTranslation;
  const writtenLangs = allLanguages.filter((l) => translations[l.code]);

  function updateBase(field, value) {
    setBase((b) => ({ ...b, [field]: value }));
  }

  function updateCurrent(field, value) {
    setTranslations((tr) => ({ ...tr, [activeLang]: { ...(tr[activeLang] || emptyTranslation), [field]: value } }));
  }

  function togglePanel(name) {
    setOpenPanel((p) => (p === name ? null : name));
  }

  async function persist(overrideStatus) {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const payload = {
        ...base,
        status: overrideStatus || base.status,
        author_id: base.author_id || user.id,
        tags: tagsInput.split(',').map((s) => s.trim()).filter(Boolean),
        gallery: galleryInput.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      if (overrideStatus) setBase((b) => ({ ...b, status: overrideStatus }));

      if (!isEdit) {
        const { id: newId } = await api.createArticle({
          ...payload,
          lang: activeLang,
          title: current.title,
          excerpt: current.excerpt,
          content: current.content,
          seo_title: current.seo_title,
          seo_description: current.seo_description,
        });
        navigate(`/admin/articles/${newId}`);
        return;
      }
      await api.updateArticle(id, payload);
      await api.updateArticleTranslation(id, activeLang, {
        title: current.title,
        excerpt: current.excerpt,
        content: current.content,
        seo_title: current.seo_title,
        seo_description: current.seo_description,
      });
      const refreshed = await api.adminGetArticle(id);
      setBase((b) => ({ ...b, status: refreshed.status }));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    persist();
  }

  async function onDeleteTranslation() {
    const langLabel = allLanguages.find((l) => l.code === activeLang)?.native_name || activeLang;
    if (!confirm(`Supprimer la version ${langLabel} de cet article ? Cette action est irréversible.`)) return;
    setError(null);
    try {
      await api.deleteArticleTranslation(id, activeLang);
      const refreshed = await api.adminGetArticle(id);
      const normalized = {};
      for (const [lang, tr] of Object.entries(refreshed.translations)) {
        normalized[lang] = {
          title: tr.title || '',
          excerpt: tr.excerpt || '',
          content: tr.content || '',
          seo_title: tr.seo_title || '',
          seo_description: tr.seo_description || '',
        };
      }
      setTranslations(normalized);
      const remaining = Object.keys(refreshed.translations);
      setActiveLang(remaining[0] || 'fr');
    } catch (err) {
      setError(err.message);
    }
  }

  const isPublished = base.status === 'published';

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <Link to="/admin/articles" className="editor-topbar__back">← Articles</Link>
        <span className={`status-dot status-dot--${base.status}`}>
          <i /> {STATUS_LABELS[base.status]}
        </span>
        <div className="editor-topbar__spacer" />
        {error && <span className="editor-topbar__error">{error}</span>}
        {saved && !error && <span className="editor-topbar__saved">Enregistré</span>}
        <button type="button" className="btn btn--outline btn--sm" onClick={() => persist()} disabled={saving}>
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => persist('published')}
          disabled={saving}
        >
          {isPublished ? 'Mettre à jour' : 'Publier'}
        </button>
      </header>

      {isEdit && (
        <div className="editor-lang-tabs">
          {allLanguages.map((l) => (
            <button
              key={l.code}
              type="button"
              className={'editor-lang-tabs__tab' + (l.code === activeLang ? ' is-active' : '') + (translations[l.code] ? ' has-content' : '')}
              onClick={() => setActiveLang(l.code)}
            >
              {l.native_name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="editor-canvas">
        <label className="editor-field-label">Titre</label>
        <input
          className="editor-title-input"
          value={current.title}
          onChange={(e) => updateCurrent('title', e.target.value)}
          placeholder="Nouvelle actualité au Bénin..."
          required
        />

        <label className="editor-field-label">Chapô</label>
        <textarea
          className="editor-excerpt-input"
          value={current.excerpt}
          onChange={(e) => updateCurrent('excerpt', e.target.value)}
          placeholder="Les dernières informations..."
          rows={2}
        />

        <RichTextEditor
          key={`${id || 'new'}-${activeLang}`}
          value={current.content}
          onChange={(html) => updateCurrent('content', html)}
          placeholder="Votre article commence ici..."
        />

        <div className="editor-bottombar">
          <button type="button" className={'editor-bottombar__pill' + (openPanel === 'category' ? ' is-open' : '')} onClick={() => togglePanel('category')}>
            Catégorie <IconChevronDown />
          </button>
          <button type="button" className={'editor-bottombar__pill' + (openPanel === 'image' ? ' is-open' : '')} onClick={() => togglePanel('image')}>
            Image <IconChevronDown />
          </button>
          <button type="button" className={'editor-bottombar__pill' + (openPanel === 'author' ? ' is-open' : '')} onClick={() => togglePanel('author')}>
            Auteur <IconChevronDown />
          </button>
          <button type="button" className={'editor-bottombar__pill' + (openPanel === 'publication' ? ' is-open' : '')} onClick={() => togglePanel('publication')}>
            Publication <IconChevronDown />
          </button>
        </div>

        {openPanel === 'category' && (
          <div className="editor-panel">
            <label>
              Catégorie
              <select value={base.category_id} onChange={(e) => updateBase('category_id', e.target.value)} required>
                <option value="">— Choisir —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              Tags (séparés par des virgules)
              <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="politique, élections, bénin" />
            </label>
          </div>
        )}

        {openPanel === 'image' && (
          <div className="editor-panel">
            <label>
              Image principale (URL)
              <input value={base.cover_image} onChange={(e) => updateBase('cover_image', e.target.value)} />
            </label>
            <label>
              Galerie d'images (une URL par ligne)
              <textarea value={galleryInput} onChange={(e) => setGalleryInput(e.target.value)} rows={3} placeholder={'https://...\nhttps://...'} />
            </label>
            <label>
              Vidéo associée (URL, optionnel)
              <input value={base.video_url} onChange={(e) => updateBase('video_url', e.target.value)} placeholder="https://..." />
            </label>
          </div>
        )}

        {openPanel === 'author' && (
          <div className="editor-panel">
            <label>
              Auteur
              <select value={base.author_id} onChange={(e) => updateBase('author_id', e.target.value)}>
                <option value="">— Moi ({user?.name}) —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {openPanel === 'publication' && (
          <div className="editor-panel">
            <label>
              Statut
              <select value={base.status} onChange={(e) => updateBase('status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {base.status === 'scheduled' && (
              <label>
                Date et heure de publication
                <input
                  type="datetime-local"
                  value={base.scheduled_at}
                  onChange={(e) => updateBase('scheduled_at', e.target.value)}
                  required
                />
              </label>
            )}
            <label className="admin-form__checkbox">
              <input type="checkbox" checked={base.is_featured} onChange={(e) => updateBase('is_featured', e.target.checked)} />
              Mettre à la une
            </label>
            <hr />
            <label>
              Titre SEO ({allLanguages.find((l) => l.code === activeLang)?.native_name})
              <input value={current.seo_title} onChange={(e) => updateCurrent('seo_title', e.target.value)} maxLength={255} />
            </label>
            <label>
              Meta description
              <textarea value={current.seo_description} onChange={(e) => updateCurrent('seo_description', e.target.value)} rows={2} maxLength={300} />
            </label>
            {isEdit && writtenLangs.length > 0 && (
              <p className="editor-panel__hint">Rédigé dans : {writtenLangs.map((l) => l.code.toUpperCase()).join(', ')}</p>
            )}
            {isEdit && writtenLangs.length > 1 && translations[activeLang] && (
              <button type="button" className="btn btn--outline btn--sm" onClick={onDeleteTranslation}>
                Supprimer la version {allLanguages.find((l) => l.code === activeLang)?.native_name}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
