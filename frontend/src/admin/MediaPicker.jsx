import { useState } from 'react';
import { api } from '../api';
import { IconUpload, IconImage, IconVideo } from '../components/Icons';

// Sélecteur de média réel : envoie un fichier vers Cloudinary (organisé par
// "dossier" = le projet concerné) ou permet de resélectionner un fichier déjà
// envoyé dans ce dossier, sans avoir à recoller une URL à la main. Le champ
// URL reste éditable en dessous pour qui préfère coller un lien existant.
export default function MediaPicker({ folder, type = 'image', value, onChange, placeholder, hideUrlInput = false, closeOnPick = true }) {
  const [open, setOpen] = useState(false);
  const [gallery, setGallery] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  function loadGallery() {
    setGallery(null);
    api.getMediaGallery(folder, type).then(setGallery).catch((err) => {
      setError(err.message);
      setGallery([]);
    });
  }

  function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next) loadGallery();
  }

  async function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadMedia(file, folder);
      onChange(res.url);
      loadGallery();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="media-picker">
      <div className="media-picker__row">
        {!hideUrlInput && (
          <input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
        <button type="button" className="btn btn--sm btn--outline" onClick={togglePanel}>
          {type === 'video' ? <IconVideo /> : <IconImage />} Galerie
        </button>
      </div>

      {open && (
        <div className="media-picker__panel">
          <label className="btn btn--sm media-picker__upload-btn">
            <IconUpload /> {uploading ? 'Envoi…' : 'Envoyer un fichier'}
            <input
              type="file"
              accept={type === 'video' ? 'video/*' : 'image/*'}
              onChange={onFileSelected}
              disabled={uploading}
              hidden
            />
          </label>

          {error && <p className="admin-form__error" style={{ margin: '8px 0 0' }}>{error}</p>}

          {gallery === null ? (
            <p className="admin-empty" style={{ padding: '8px 0' }}>Chargement…</p>
          ) : gallery.length === 0 ? (
            <p className="admin-empty" style={{ padding: '8px 0' }}>Aucun fichier envoyé ici pour l'instant.</p>
          ) : (
            <div className="media-picker__grid">
              {gallery.map((g) => (
                <button
                  type="button"
                  key={g.public_id}
                  className={'media-picker__thumb' + (value === g.url ? ' is-selected' : '')}
                  onClick={() => { onChange(g.url); if (closeOnPick) setOpen(false); }}
                  title={g.public_id}
                >
                  {type === 'video' ? <video src={g.url} muted /> : <img src={g.thumbnail_url} alt="" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
