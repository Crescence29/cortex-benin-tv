import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import AdminLayout from './AdminLayout';

const emptyBase = {
  video_url: '',
  thumbnail: '',
  program: '',
  category_id: '',
  duration_seconds: '',
  status: 'draft',
};
const emptyTranslation = { title: '', description: '' };

export default function VideoForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [allLanguages, setAllLanguages] = useState([]);
  const [base, setBase] = useState(emptyBase);
  const [translations, setTranslations] = useState({});
  const [activeLang, setActiveLang] = useState('fr');
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getCategories({ lang: 'fr' }).then(setCategories);
    api.getLanguages().then(setAllLanguages).catch(() => setAllLanguages([{ code: 'fr', native_name: 'Français' }]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.adminGetVideo(id).then((v) => {
      setBase({
        video_url: v.video_url || '',
        thumbnail: v.thumbnail || '',
        program: v.program || '',
        category_id: v.category_id || '',
        duration_seconds: v.duration_seconds || '',
        status: v.status || 'draft',
      });
      const normalized = {};
      for (const tr of v.translations) {
        normalized[tr.lang_code] = { title: tr.title || '', description: tr.description || '' };
      }
      setTranslations(normalized);
      const firstLang = v.translations[0]?.lang_code;
      if (firstLang) setActiveLang(firstLang);
      setLoading(false);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
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

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      if (isEdit) {
        await Promise.all([
          api.updateVideo(id, {
            category_id: base.category_id,
            video_url: base.video_url,
            thumbnail: base.thumbnail,
            program: base.program,
            duration_seconds: base.duration_seconds || null,
            status: base.status,
          }),
          api.updateVideoTranslation(id, activeLang, {
            title: current.title,
            description: current.description,
          }),
        ]);
        setSaved(true);
      } else {
        await api.createVideo({
          ...base,
          lang: activeLang,
          title: current.title,
          description: current.description,
        });
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDeleteTranslation() {
    const langLabel = allLanguages.find((l) => l.code === activeLang)?.native_name || activeLang;
    if (!confirm(`Supprimer la version ${langLabel} de cette vidéo ? Cette action est irréversible.`)) return;
    try {
      await api.deleteVideoTranslation(id, activeLang);
      const refreshed = await api.adminGetVideo(id);
      const normalized = {};
      for (const tr of refreshed.translations) {
        normalized[tr.lang_code] = { title: tr.title || '', description: tr.description || '' };
      }
      setTranslations(normalized);
      setActiveLang(refreshed.translations[0]?.lang_code || 'fr');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-topbar"><h1>{t('chargement')}</h1></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>{isEdit ? 'Modifier la vidéo' : t('nouvelle_video')}</h1>
          <p className="admin-topbar__subtitle">
            <Link to="/admin">← Retour au tableau de bord</Link>
          </p>
        </div>
      </div>

      {isEdit && (
        <div className="editor-lang-tabs" style={{ marginBottom: 20 }}>
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

      <form onSubmit={onSubmit} className="admin-form">
        {error && <p className="admin-form__error">{error}</p>}
        {saved && <p className="admin-form__success">Enregistré.</p>}
        {!isEdit && (
          <label>
            Langue de cette version
            <select value={activeLang} onChange={(e) => setActiveLang(e.target.value)}>
              {allLanguages.map((l) => (
                <option key={l.code} value={l.code}>{l.native_name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t('titre')}
          <input value={current.title} onChange={(e) => updateCurrent('title', e.target.value)} required />
        </label>
        <label>
          Description
          <textarea value={current.description} onChange={(e) => updateCurrent('description', e.target.value)} rows={3} />
        </label>
        <label>
          URL de la vidéo
          <input value={base.video_url} onChange={(e) => updateBase('video_url', e.target.value)} required />
        </label>
        <label>
          Miniature (URL)
          <input value={base.thumbnail} onChange={(e) => updateBase('thumbnail', e.target.value)} />
        </label>
        <label>
          Émission (optionnel)
          <input value={base.program} onChange={(e) => updateBase('program', e.target.value)} />
        </label>
        <label>
          Durée (secondes, optionnel)
          <input type="number" min="0" value={base.duration_seconds} onChange={(e) => updateBase('duration_seconds', e.target.value)} />
        </label>
        <label>
          {t('categorie')}
          <select value={base.category_id} onChange={(e) => updateBase('category_id', e.target.value)} required>
            <option value="">— Choisir —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          {t('statut')}
          <select value={base.status} onChange={(e) => updateBase('status', e.target.value)}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </label>
        <button type="submit" className="btn">{isEdit ? 'Enregistrer les modifications' : 'Enregistrer'}</button>
        {isEdit && writtenLangs.length > 1 && translations[activeLang] && (
          <button type="button" className="btn btn--outline btn--sm" onClick={onDeleteTranslation} style={{ marginLeft: 10 }}>
            Supprimer la version {allLanguages.find((l) => l.code === activeLang)?.native_name}
          </button>
        )}
      </form>
    </AdminLayout>
  );
}
