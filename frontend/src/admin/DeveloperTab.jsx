import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import AdminLayout from './AdminLayout';
import { setLogoState } from '../logoStore';
import {
  IconLogIn,
  IconAlertTriangle,
  IconUserPlus,
  IconTrash,
  IconShield,
  IconSettings,
  IconBroadcast,
  IconRefresh,
  IconLock,
  IconLink,
} from '../components/Icons';

const SENSITIVE_ACTIONS = new Set(['login_failed', 'role_changed', 'user_deleted', 'password_reset']);

const ACTION_META = {
  login_success: { label: 'Connexion réussie', icon: IconLogIn },
  login_failed: { label: 'Échec de connexion', icon: IconAlertTriangle },
  user_created: { label: 'Compte créé', icon: IconUserPlus },
  role_changed: { label: 'Rôle modifié', icon: IconShield },
  user_deleted: { label: 'Compte supprimé', icon: IconTrash },
  password_reset: { label: 'Mot de passe réinitialisé', icon: IconLock },
  settings_updated: { label: 'Réglages modifiés', icon: IconSettings },
  live_started: { label: 'Direct démarré', icon: IconBroadcast },
  live_stopped: { label: 'Direct arrêté', icon: IconBroadcast },
};

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function AdminAccessPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  function load() {
    api.getUsers().then(setUsers);
  }

  useEffect(load, []);

  async function onReset(u) {
    if (!confirm(`Réinitialiser le mot de passe de ${u.name} ? L'ancien mot de passe cessera immédiatement de fonctionner.`)) return;
    setBusyId(u.id);
    setError(null);
    setResult(null);
    try {
      const newPassword = generatePassword();
      await api.updateUser(u.id, { password: newPassword });
      setResult({ name: u.name, email: u.email, password: newPassword });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function copyPassword() {
    navigator.clipboard?.writeText(result.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2><IconLock style={{ width: 16, height: 16, marginRight: 6, verticalAlign: -2 }} /> Accès administrateurs</h2>
      </div>

      {error && <p className="admin-form__error" style={{ margin: '16px 20px 0' }}>{error}</p>}

      {result && (
        <div className="password-reset-result">
          <p>
            Nouveau mot de passe pour <strong>{result.name}</strong> ({result.email}) —
            copiez-le maintenant, il ne sera plus affiché ensuite. Communiquez-le à la personne
            par un canal sûr.
          </p>
          <div className="password-reset-result__value">
            <code>{result.password}</code>
            <button type="button" className="btn btn--sm" onClick={copyPassword}>
              <IconLink /> {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <button type="button" className="link-btn" onClick={() => setResult(null)}>Fermer</button>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr><th>Nom</th><th>Email</th><th>Rôle</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role === 'admin' ? 'Administrateur' : 'Journaliste'}</td>
              <td>
                <button
                  type="button"
                  className="btn btn--sm btn--outline"
                  onClick={() => onReset(u)}
                  disabled={busyId === u.id}
                >
                  <IconLock /> {busyId === u.id ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.getActivityLogs().then(setLogs).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Journal d'activité</h2>
        <button type="button" className="btn btn--sm btn--outline" onClick={load}>
          <IconRefresh /> Actualiser
        </button>
      </div>
      {!loading && logs.length === 0 && <div className="admin-empty">Aucun événement enregistré.</div>}
      <div className="activity-log">
        {logs.map((log) => {
          const meta = ACTION_META[log.action] || { label: log.action, icon: IconSettings };
          const Icon = meta.icon;
          const sensitive = SENSITIVE_ACTIONS.has(log.action);
          return (
            <div className="activity-log__row" key={log.id}>
              <span className={'activity-log__icon' + (sensitive ? ' is-sensitive' : '')}>
                <Icon />
              </span>
              <div className="activity-log__body">
                <div className="activity-log__line">
                  <strong>{meta.label}</strong>
                  {sensitive && <span className="activity-log__badge">SENSIBLE</span>}
                </div>
                <div className="activity-log__meta">
                  {log.actor_name || 'Inconnu'} {log.actor_role ? `(${log.actor_role})` : ''}
                  {log.details ? ` — ${log.details}` : ''}
                  {log.ip_address ? ` · IP ${log.ip_address}` : ''}
                </div>
              </div>
              <div className="activity-log__time">{new Date(log.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IdentityPanel() {
  const [mode, setMode] = useState('image');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getSettings().then((s) => {
      setMode(s.logo_mode || 'image');
      setText(s.logo_text || 'CORTEX BÉNIN TV');
    });
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.updateSettings({ logo_mode: mode, logo_text: text });
      setLogoState(res.settings);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Identité visuelle</h2>
      </div>
      <div className="identity-panel">
        {error && <p className="admin-form__error">{error}</p>}
        {saved && <p className="admin-form__success">Enregistré — mis à jour instantanément sur le site.</p>}

        <div className="identity-panel__toggle">
          <button
            type="button"
            className={'identity-panel__toggle-btn' + (mode === 'image' ? ' is-active' : '')}
            onClick={() => setMode('image')}
          >
            Logo image
          </button>
          <button
            type="button"
            className={'identity-panel__toggle-btn' + (mode === 'text' ? ' is-active' : '')}
            onClick={() => setMode('text')}
          >
            Nom de marque texte
          </button>
        </div>

        {mode === 'text' && (
          <label className="identity-panel__field">
            Texte affiché
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={60} />
          </label>
        )}

        <div className="identity-panel__preview-label">Aperçu en direct</div>
        <div className="identity-panel__preview">
          {mode === 'text' ? (
            <span className="brand-text-logo">{text || 'CORTEX BÉNIN TV'}</span>
          ) : (
            <img src="/logo.png" alt="Cortex Bénin TV" style={{ height: 40 }} />
          )}
        </div>

        <button type="button" className="btn" onClick={onSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

export default function DeveloperTab() {
  const { user } = useAuth();

  if (!user?.is_super_admin) {
    return (
      <AdminLayout>
        <div className="admin-topbar"><h1>Accès refusé</h1></div>
        <div className="admin-empty">Cette section est réservée au super-administrateur.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Développeur</h1>
          <p className="admin-topbar__subtitle">Journal d'activité et identité visuelle — accès super-admin uniquement</p>
        </div>
      </div>

      <AdminAccessPanel />
      <ActivityLog />
      <IdentityPanel />
    </AdminLayout>
  );
}
