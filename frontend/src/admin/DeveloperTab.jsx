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

function formatBytes(bytes) {
  if (bytes == null) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds) {
  if (seconds == null) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

function usagePercent(usedBytes, totalBytes) {
  if (!totalBytes) return null;
  return Math.round((usedBytes / totalBytes) * 100);
}

function StatusDot({ ok }) {
  return <span className={'status-dot-inline' + (ok ? ' is-ok' : ' is-down')} />;
}

function SystemStatusPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);

  function load() {
    api.getSystemStatus().then(setStatus).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function onBackup() {
    setBacking(true);
    setBackupMsg(null);
    try {
      const result = await api.triggerBackup();
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cortex-backup-${result.createdAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg(`Sauvegarde téléchargée — ${result.tables} tables exportées.`);
      load();
    } catch (err) {
      setBackupMsg(err.message);
    } finally {
      setBacking(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="admin-panel">
        <div className="admin-panel__header"><h2>État technique</h2></div>
        <div className="admin-empty">Chargement…</div>
      </div>
    );
  }
  if (!status) return null;

  const memPct = usagePercent(status.memory?.usedBytes, status.memory?.totalBytes);
  const diskPct = status.disk ? usagePercent(status.disk.usedBytes, status.disk.totalBytes) : null;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>État technique</h2>
        <button type="button" className="btn btn--sm btn--outline" onClick={onBackup} disabled={backing}>
          <IconRefresh /> {backing ? 'Sauvegarde…' : 'Sauvegarder maintenant'}
        </button>
      </div>
      {backupMsg && <p className="admin-form__success" style={{ padding: '0 20px' }}>{backupMsg}</p>}

      <div className="system-status-grid">
        <div className="system-status-row">
          <span><StatusDot ok={status.api === 'ok'} /> API</span>
          <span>{status.api === 'ok' ? 'Opérationnelle' : 'Problème'}</span>
        </div>
        <div className="system-status-row">
          <span><StatusDot ok={status.db === 'ok'} /> Base de données</span>
          <span>{status.db === 'ok' ? `Opérationnelle (${status.dbLatencyMs} ms)` : 'Problème'}</span>
        </div>
        <div className="system-status-row">
          <span>Temps de réponse moyen</span>
          <span>{status.avgResponseTimeMs != null ? `${status.avgResponseTimeMs} ms` : '—'}</span>
        </div>
        <div className="system-status-row">
          <span>Requêtes traitées</span>
          <span>{status.requestCount.toLocaleString()} (depuis le dernier redémarrage)</span>
        </div>
        <div className="system-status-row">
          <span>Erreurs serveur</span>
          <span>{status.errorCount} (depuis le dernier redémarrage)</span>
        </div>
        <div className="system-status-row">
          <span>Connexions (24 h)</span>
          <span>
            {status.loginsLast24h} {status.lastLoginAt ? `· dernière : ${new Date(status.lastLoginAt).toLocaleString()}` : ''}
          </span>
        </div>
        <div className="system-status-row">
          <span>Disponibilité du serveur</span>
          <span>{formatUptime(status.uptimeSeconds)}</span>
        </div>
        <div className="system-status-row">
          <span>CPU (charge 1 min)</span>
          <span>{status.cpuLoad1m.toFixed(2)} sur {status.cpuCount} cœur{status.cpuCount > 1 ? 's' : ''}</span>
        </div>
        <div className="system-status-row">
          <span>Mémoire (RAM)</span>
          <span>{memPct != null ? `${memPct}% utilisée` : '—'} ({formatBytes(status.memory?.usedBytes)} / {formatBytes(status.memory?.totalBytes)})</span>
        </div>
        <div className="system-status-row">
          <span>Espace disque</span>
          <span>{status.disk ? `${diskPct}% utilisé (${formatBytes(status.disk.usedBytes)} / ${formatBytes(status.disk.totalBytes)})` : 'Non disponible sur cet hébergement'}</span>
        </div>
        <div className="system-status-row">
          <span>Version de l'application</span>
          <span>{status.version}</span>
        </div>
        <div className="system-status-row">
          <span>Dernier déploiement</span>
          <span>{status.deployCommit ? status.deployCommit.slice(0, 7) : 'Non communiqué par l’hébergeur'}</span>
        </div>
        <div className="system-status-row">
          <span>Dernière sauvegarde</span>
          <span>{status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString() : 'Aucune sauvegarde effectuée pour le moment'}</span>
        </div>
      </div>

      {status.recentErrors.length > 0 && (
        <>
          <div className="admin-panel__header" style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: '0.95rem' }}>Erreurs récentes</h2>
          </div>
          <div className="activity-log">
            {status.recentErrors.map((e, i) => (
              <div className="activity-log__row" key={i}>
                <span className="activity-log__icon is-sensitive"><IconAlertTriangle /></span>
                <div className="activity-log__body">
                  <div className="activity-log__line"><strong>{e.message}</strong></div>
                  <div className="activity-log__meta">{e.method} {e.path}</div>
                </div>
                <div className="activity-log__time">{new Date(e.at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
  manual_backup: { label: 'Sauvegarde manuelle', icon: IconRefresh },
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

      <SystemStatusPanel />
      <AdminAccessPanel />
      <ActivityLog />
      <IdentityPanel />
    </AdminLayout>
  );
}
