import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconBroadcast } from '../components/Icons';

function StreamPanel({ slug, label, hint }) {
  const [live, setLive] = useState({ is_live: false, title: '', stream_url: '' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLive(slug).then((l) => {
      setLive({ is_live: !!l.is_live, title: l.title || '', stream_url: l.stream_url || '' });
      setLoading(false);
    });
  }, [slug]);

  async function onSave(e) {
    e.preventDefault();
    setSaved(false);
    await api.updateLive(live, slug);
    setSaved(true);
  }

  return (
    <div className="admin-panel" style={{ marginBottom: 24 }}>
      <div className="admin-panel__header">
        <h2><IconBroadcast style={{ width: 16, height: 16, marginRight: 6, verticalAlign: -2 }} /> {label}</h2>
      </div>
      <div style={{ padding: '0 20px' }}>
        <p className="admin-topbar__subtitle" style={{ margin: '12px 0' }}>{hint}</p>

        <div className={'live-panel' + (live.is_live ? '' : ' live-panel--off')} style={{ marginBottom: 20 }}>
          <div className="live-panel__title">
            <IconBroadcast /> {label}
          </div>
          <div className="live-panel__status">{live.is_live ? 'À l’antenne' : 'Hors antenne'}</div>
          {live.is_live && live.title && <div className="live-panel__hint">{live.title}</div>}
        </div>

        {!loading && (
          <form onSubmit={onSave} className="admin-form" style={{ boxShadow: 'none', margin: '0 0 20px' }}>
            {saved && <p className="admin-form__success">Enregistré.</p>}
            <label className="admin-form__checkbox">
              <input
                type="checkbox"
                checked={live.is_live}
                onChange={(e) => setLive((l) => ({ ...l, is_live: e.target.checked }))}
              />
              Ce flux est actuellement à l'antenne
            </label>
            <label>
              Titre du programme en cours
              <input
                value={live.title}
                onChange={(e) => setLive((l) => ({ ...l, title: e.target.value }))}
                placeholder="Journal du soir"
              />
            </label>
            <label>
              URL de diffusion (flux vidéo ou lien d'intégration)
              <input
                value={live.stream_url}
                onChange={(e) => setLive((l) => ({ ...l, stream_url: e.target.value }))}
                placeholder="https://..."
              />
            </label>
            <button type="submit" className="btn">Enregistrer</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LiveManager() {
  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Direct</h1>
          <p className="admin-topbar__subtitle">Contrôle des flux en direct du site public — deux flux indépendants</p>
        </div>
      </div>

      <StreamPanel
        slug="main"
        label="Direct principal"
        hint="Diffusé sur la page « En Continu » (/direct) et l'indicateur EN DIRECT du site."
      />
      <StreamPanel
        slug="local"
        label="Direct local"
        hint="Diffusé uniquement sur la page « En Direct Local » (/en-direct-local)."
      />
    </AdminLayout>
  );
}
