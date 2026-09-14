import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import AdminLayout from './AdminLayout';
import { setLogoState } from '../logoStore';
import { roleLabel, canManage } from './roles';
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
  IconBan,
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

function RouteList({ routes }) {
  if (!routes || routes.length === 0) return <p className="admin-empty">Aucune requête enregistrée pour le moment.</p>;
  return (
    <ul className="detail-list">
      {routes.map((r) => (
        <li key={r.route}>
          <code>{r.route}</code>
          <span>{r.count} appel{r.count > 1 ? 's' : ''}</span>
        </li>
      ))}
    </ul>
  );
}

function LoginList({ logins }) {
  if (!logins || logins.length === 0) return <p className="admin-empty">Aucune connexion enregistrée pour le moment.</p>;
  return (
    <ul className="detail-list">
      {logins.map((l, i) => (
        <li key={i}>
          <span>{l.actor_name || 'Inconnu'} {l.actor_role ? `(${l.actor_role})` : ''}{l.ip_address ? ` · ${l.ip_address}` : ''}</span>
          <span>{new Date(l.created_at).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function TableSizeList({ tables }) {
  if (!tables || tables.length === 0) return <p className="admin-empty">Détail indisponible.</p>;
  return (
    <ul className="detail-list">
      {tables.map((t) => (
        <li key={t.table}>
          <code>{t.table}</code>
          <span>{formatBytes(t.sizeBytes)} · {Number(t.rows).toLocaleString()} lignes (estimation)</span>
        </li>
      ))}
    </ul>
  );
}

function ResponseTimeList({ samples }) {
  if (!samples || samples.length === 0) return <p className="admin-empty">Pas encore assez de requêtes pour un détail.</p>;
  return (
    <p className="admin-empty" style={{ padding: '10px 20px', lineHeight: 1.8 }}>
      {samples.length} dernières mesures (ms) : {samples.join(', ')}
    </p>
  );
}

function DetailRow({ label, value, detailKey, openKey, setOpenKey, children, statusOk }) {
  const open = openKey === detailKey;
  return (
    <>
      <button
        type="button"
        className="system-status-row system-status-row--clickable"
        onClick={() => setOpenKey(open ? null : detailKey)}
      >
        <span>{statusOk !== undefined && <StatusDot ok={statusOk} />} {label}</span>
        <span>{value}</span>
      </button>
      {open && <div className="system-status-detail">{children}</div>}
    </>
  );
}

function SystemStatusPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);
  const [openKey, setOpenKey] = useState(null);

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
        <DetailRow
          label="API" detailKey="api" openKey={openKey} setOpenKey={setOpenKey}
          statusOk={status.api === 'ok'} value={status.api === 'ok' ? 'Opérationnelle' : 'Problème'}
        >
          <p className="admin-empty" style={{ padding: '10px 20px' }}>Dernière vérification : {new Date(status.checkedAt).toLocaleString()}</p>
        </DetailRow>

        <DetailRow
          label="Base de données" detailKey="db" openKey={openKey} setOpenKey={setOpenKey}
          statusOk={status.db === 'ok'}
          value={status.db === 'ok' ? `Opérationnelle (${status.dbLatencyMs} ms)` : 'Problème'}
        >
          <TableSizeList tables={status.tableSizes} />
        </DetailRow>

        <DetailRow
          label="Temps de réponse moyen" detailKey="response" openKey={openKey} setOpenKey={setOpenKey}
          value={status.avgResponseTimeMs != null ? `${status.avgResponseTimeMs} ms` : '—'}
        >
          <ResponseTimeList samples={status.responseTimeSamples} />
        </DetailRow>

        <DetailRow
          label="Requêtes traitées" detailKey="requests" openKey={openKey} setOpenKey={setOpenKey}
          value={`${status.requestCount.toLocaleString()} (depuis le dernier redémarrage)`}
        >
          <RouteList routes={status.topRoutes} />
        </DetailRow>

        <DetailRow
          label="Erreurs serveur" detailKey="errors" openKey={openKey} setOpenKey={setOpenKey}
          value={`${status.errorCount} (depuis le dernier redémarrage)`}
        >
          {status.recentErrors.length === 0 ? (
            <p className="admin-empty" style={{ padding: '10px 20px' }}>Aucune erreur depuis le dernier redémarrage.</p>
          ) : (
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
          )}
        </DetailRow>

        <DetailRow
          label="Connexions (24 h)" detailKey="logins" openKey={openKey} setOpenKey={setOpenKey}
          value={`${status.loginsLast24h}${status.lastLoginAt ? ` · dernière : ${new Date(status.lastLoginAt).toLocaleString()}` : ''}`}
        >
          <LoginList logins={status.recentLogins} />
        </DetailRow>

        <DetailRow
          label="Disponibilité du serveur" detailKey="uptime" openKey={openKey} setOpenKey={setOpenKey}
          value={formatUptime(status.uptimeSeconds)}
        >
          <p className="admin-empty" style={{ padding: '10px 20px' }}>
            Démarré le {new Date(Date.now() - status.uptimeSeconds * 1000).toLocaleString()}
          </p>
        </DetailRow>

        <DetailRow
          label="CPU (charge 1 min)" detailKey="cpu" openKey={openKey} setOpenKey={setOpenKey}
          value={`${status.cpuLoad1m.toFixed(2)} sur ${status.cpuCount} cœur${status.cpuCount > 1 ? 's' : ''}`}
        >
          <ul className="detail-list">
            <li><span>Charge moyenne (1 min)</span><span>{status.cpuLoad1m.toFixed(2)}</span></li>
            <li><span>Charge moyenne (5 min)</span><span>{status.cpuLoad5m.toFixed(2)}</span></li>
            <li><span>Charge moyenne (15 min)</span><span>{status.cpuLoad15m.toFixed(2)}</span></li>
          </ul>
        </DetailRow>

        <DetailRow
          label="Mémoire (RAM)" detailKey="ram" openKey={openKey} setOpenKey={setOpenKey}
          value={`${memPct != null ? `${memPct}% utilisée` : '—'} (${formatBytes(status.memory?.usedBytes)} / ${formatBytes(status.memory?.totalBytes)})`}
        >
          <ul className="detail-list">
            <li><span>Mémoire du process (RSS)</span><span>{formatBytes(status.processMemory?.rss)}</span></li>
            <li><span>Tas JavaScript utilisé</span><span>{formatBytes(status.processMemory?.heapUsed)}</span></li>
            <li><span>Tas JavaScript alloué</span><span>{formatBytes(status.processMemory?.heapTotal)}</span></li>
          </ul>
        </DetailRow>

        <DetailRow
          label="Espace disque" detailKey="disk" openKey={openKey} setOpenKey={setOpenKey}
          value={status.disk ? `${diskPct}% utilisé (${formatBytes(status.disk.usedBytes)} / ${formatBytes(status.disk.totalBytes)})` : 'Non disponible sur cet hébergement'}
        >
          <TableSizeList tables={status.tableSizes} />
        </DetailRow>

        <DetailRow
          label="Version de l'application" detailKey="version" openKey={openKey} setOpenKey={setOpenKey}
          value={status.version}
        >
          <p className="admin-empty" style={{ padding: '10px 20px' }}>Numéro de version défini dans le fichier package.json du backend.</p>
        </DetailRow>

        <DetailRow
          label="Dernier déploiement" detailKey="deploy" openKey={openKey} setOpenKey={setOpenKey}
          value={status.deployCommit ? status.deployCommit.slice(0, 7) : 'Non communiqué par l’hébergeur'}
        >
          {status.deployCommit ? (
            <p className="admin-empty" style={{ padding: '10px 20px' }}>
              <a href={`https://github.com/Crescence29/cortex-benin-tv/commit/${status.deployCommit}`} target="_blank" rel="noopener noreferrer">
                Voir ce commit sur GitHub →
              </a>
            </p>
          ) : (
            <p className="admin-empty" style={{ padding: '10px 20px' }}>L'hébergeur actuel ne fournit pas cette information.</p>
          )}
        </DetailRow>

        <DetailRow
          label="Dernière sauvegarde" detailKey="backup" openKey={openKey} setOpenKey={setOpenKey}
          value={status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString() : 'Aucune sauvegarde effectuée pour le moment'}
        >
          <p className="admin-empty" style={{ padding: '10px 20px' }}>
            Une seule sauvegarde est conservée à la fois. Utilisez « Sauvegarder maintenant » ci-dessus pour en refaire une.
          </p>
        </DetailRow>
      </div>
    </div>
  );
}

function EndpointGroupList({ groups }) {
  if (!groups || groups.length === 0) return <p className="admin-empty">Aucun endpoint enregistré.</p>;
  return (
    <div className="api-endpoint-groups">
      {groups.map((g) => (
        <div key={g.group} className="api-endpoint-group">
          <div className="api-endpoint-group__title">{g.group}</div>
          <ul className="detail-list">
            {g.routes.map((r, i) => (
              <li key={i}>
                <code><span className={`api-method api-method--${r.method.toLowerCase()}`}>{r.method}</span> {r.path}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EndpointStatsTable({ stats }) {
  if (!stats || stats.length === 0) return <p className="admin-empty">Aucune requête enregistrée depuis le dernier redémarrage.</p>;
  return (
    <table className="data-table data-table--compact">
      <thead>
        <tr><th>Endpoint</th><th>Requêtes</th><th>Erreurs</th></tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.route}>
            <td><code>{s.route}</code></td>
            <td>{s.count.toLocaleString()}</td>
            <td>{s.errors > 0 ? <span style={{ color: '#d1274a', fontWeight: 700 }}>{s.errors}</span> : 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RateLimitsList({ limits }) {
  if (!limits || limits.length === 0) return <p className="admin-empty">Aucune limite configurée.</p>;
  return (
    <ul className="detail-list">
      {limits.map((l) => (
        <li key={l.label}>
          <span>{l.label} — {l.routes.join(', ')}</span>
          <span>{l.limit} requêtes / {l.windowMinutes} min</span>
        </li>
      ))}
    </ul>
  );
}

function ExternalServicesList({ services }) {
  if (!services || services.length === 0) return <p className="admin-empty">Aucun service externe suivi.</p>;
  return (
    <ul className="detail-list">
      {services.map((s, i) => (
        <li key={i}>
          <span><StatusDot ok={s.status === 'ok'} /> {s.name}</span>
          <span>{s.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function ApiOverviewPanel() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState(null);

  function load() {
    api.getApiOverview().then(setOverview).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !overview) {
    return (
      <div className="admin-panel">
        <div className="admin-panel__header"><h2>Gestion de l'API</h2></div>
        <div className="admin-empty">Chargement…</div>
      </div>
    );
  }
  if (!overview) return null;

  const totalEndpoints = overview.endpointGroups.reduce((sum, g) => sum + g.routes.length, 0);
  const totalRequests = overview.endpointStats.reduce((sum, s) => sum + s.count, 0);
  const totalErrors = overview.endpointStats.reduce((sum, s) => sum + s.errors, 0);
  const allOk = overview.externalServices.every((s) => s.status === 'ok' || s.status === 'disabled');

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Gestion de l'API</h2>
        <button type="button" className="btn btn--sm btn--outline" onClick={load}>
          <IconRefresh /> Actualiser
        </button>
      </div>

      <div className="system-status-grid">
        <DetailRow
          label="Version de l'API" detailKey="api-version" openKey={openKey} setOpenKey={setOpenKey}
          value={`v${overview.version}`}
        >
          <p className="admin-empty" style={{ padding: '10px 20px' }}>
            Une seule version publiée pour le moment — pas de schéma de versionnage (/v1, /v2) en place.
          </p>
        </DetailRow>

        <DetailRow
          label="Endpoints enregistrés" detailKey="api-endpoints" openKey={openKey} setOpenKey={setOpenKey}
          value={`${totalEndpoints} routes`}
        >
          <EndpointGroupList groups={overview.endpointGroups} />
        </DetailRow>

        <DetailRow
          label="Requêtes & erreurs par endpoint" detailKey="api-stats" openKey={openKey} setOpenKey={setOpenKey}
          value={`${totalRequests.toLocaleString()} requêtes · ${totalErrors} erreur${totalErrors > 1 ? 's' : ''} (depuis le dernier redémarrage)`}
        >
          <EndpointStatsTable stats={overview.endpointStats} />
        </DetailRow>

        <DetailRow
          label="Limites de requêtes" detailKey="api-limits" openKey={openKey} setOpenKey={setOpenKey}
          value={`${overview.rateLimits.length} règle${overview.rateLimits.length > 1 ? 's' : ''} active${overview.rateLimits.length > 1 ? 's' : ''}`}
        >
          <RateLimitsList limits={overview.rateLimits} />
        </DetailRow>

        <DetailRow
          label="Services externes" detailKey="api-services" openKey={openKey} setOpenKey={setOpenKey}
          statusOk={allOk}
          value={`${overview.externalServices.length} service${overview.externalServices.length > 1 ? 's' : ''} suivi${overview.externalServices.length > 1 ? 's' : ''}`}
        >
          <ExternalServicesList services={overview.externalServices} />
        </DetailRow>

        <DetailRow
          label="Clés API / Tokens / Webhooks" detailKey="api-external-access" openKey={openKey} setOpenKey={setOpenKey}
          value="Non applicable"
        >
          <p className="admin-empty" style={{ padding: '10px 20px' }}>{overview.note}</p>
        </DetailRow>
      </div>
    </div>
  );
}

const SENSITIVE_ACTIONS = new Set(['login_failed', 'role_changed', 'email_changed', 'user_deleted', 'password_reset', 'developer_access_granted', 'developer_access_revoked']);

const ACTION_META = {
  login_success: { label: 'Connexion réussie', icon: IconLogIn },
  login_failed: { label: 'Échec de connexion', icon: IconAlertTriangle },
  logout: { label: 'Déconnexion', icon: IconLogIn },
  user_created: { label: 'Compte créé', icon: IconUserPlus },
  role_changed: { label: 'Rôle modifié', icon: IconShield },
  email_changed: { label: 'Email modifié', icon: IconLock },
  user_deleted: { label: 'Compte supprimé', icon: IconTrash },
  user_deactivated: { label: 'Compte désactivé', icon: IconLock },
  user_reactivated: { label: 'Compte réactivé', icon: IconRefresh },
  password_reset: { label: 'Mot de passe réinitialisé', icon: IconLock },
  developer_access_granted: { label: 'Accès développeur accordé', icon: IconShield },
  developer_access_revoked: { label: 'Accès développeur retiré', icon: IconShield },
  force_logout: { label: 'Déconnexion forcée', icon: IconLogIn },
  sync_error: { label: 'Erreur de synchronisation', icon: IconAlertTriangle },
  client_js_error: { label: 'Erreur JavaScript (navigateur)', icon: IconAlertTriangle },
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

  async function onToggleActive(u) {
    const label = u.is_active ? 'désactiver' : 'réactiver';
    if (!confirm(`Confirmer : ${label} le compte de ${u.name} ?`)) return;
    setBusyId(u.id);
    setError(null);
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
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
          <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === me?.id;
            const manageable = canManage(me?.role, u.role);
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{roleLabel(u.role)}</td>
                <td>
                  {u.is_active ? (
                    <span className="badge badge--ok">Actif</span>
                  ) : (
                    <span className="badge badge--muted">Désactivé</span>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--outline"
                      onClick={() => onReset(u)}
                      disabled={busyId === u.id}
                    >
                      <IconLock /> {busyId === u.id ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
                    </button>
                    {manageable && !isSelf && (
                      <button
                        type="button"
                        className="btn btn--sm btn--outline"
                        onClick={() => onToggleActive(u)}
                        disabled={busyId === u.id}
                        title={u.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                      >
                        {u.is_active ? <IconBan /> : <IconRefresh />} {u.is_active ? 'Désactiver' : 'Réactiver'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  function load(q) {
    api.getActivityLogs(q).then(setLogs).finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const interval = setInterval(() => load(query), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Journal d'audit — qui a fait quoi ?</h2>
        <button type="button" className="btn btn--sm btn--outline" onClick={() => load(query)}>
          <IconRefresh /> Actualiser
        </button>
      </div>
      <div className="log-search">
        <input
          type="search"
          placeholder="Rechercher (personne, action, IP...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {!loading && logs.length === 0 && <div className="admin-empty">Aucun événement trouvé.</div>}
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

function LogsPanel() {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  function load(q) {
    api.getLogsOverview(q).then(setData).finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(() => load(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const interval = setInterval(() => load(query), 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <div className="admin-panel">
        <div className="admin-panel__header"><h2>Logs et surveillance</h2></div>
        <div className="admin-empty">Chargement…</div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Logs et surveillance</h2>
        <button type="button" className="btn btn--sm btn--outline" onClick={() => load(query)}>
          <IconRefresh /> Actualiser
        </button>
      </div>

      <div className="log-search">
        <input
          type="search"
          placeholder="Rechercher dans les logs (message, route, IP...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="log-counters">
        <span>Connexions : <strong>{data.counts.connexions}</strong></span>
        <span>Déconnexions : <strong>{data.counts.deconnexions}</strong></span>
        <span>Échecs d'auth : <strong>{data.counts.echecsAuth}</strong></span>
        <span>Erreurs sync : <strong>{data.counts.erreursSync}</strong></span>
        <span>Erreurs JS : <strong>{data.counts.erreursJs}</strong></span>
        <span>Erreurs serveur : <strong>{data.counts.erreursServeur}</strong></span>
        <span>Erreurs API : <strong>{data.counts.erreursApi}</strong></span>
        <span className="log-counters__disabled">Erreurs de paiement : N/A</span>
      </div>

      {data.events.length === 0 ? (
        <p className="admin-empty" style={{ padding: '10px 20px' }}>Aucun événement ne correspond.</p>
      ) : (
        <div className="log-lines">
          {data.events.map((e, i) => (
            <div className={'log-line' + (e.level === 'error' ? ' log-line--error' : '')} key={i}>
              <span className="log-line__tag">{e.level === 'error' ? '[ERROR]' : '[INFO]'}</span>
              <span className="log-line__time">{e.at ? new Date(e.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              <span className="log-line__category">{e.category}</span>
              <span className="log-line__label">{e.label}</span>
              {e.details && <span className="log-line__details">{e.details}</span>}
              {e.ip && <span className="log-line__ip">IP {e.ip}</span>}
            </div>
          ))}
        </div>
      )}

      <p className="admin-empty" style={{ padding: '10px 20px', fontStyle: 'italic' }}>{data.paymentNote}</p>
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

  if (!user?.is_developer) {
    return (
      <AdminLayout>
        <div className="admin-topbar"><h1>Accès refusé</h1></div>
        <div className="admin-empty">Cette section est réservée aux comptes développeur.</div>
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
      <ApiOverviewPanel />
      <LogsPanel />
      <AdminAccessPanel />
      <ActivityLog />
      <IdentityPanel />
    </AdminLayout>
  );
}
