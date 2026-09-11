import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import AdminLayout from './AdminLayout';
import { IconTrash, IconPlus, IconLock, IconChevronDown, IconLogout, IconBan, IconRefresh } from '../components/Icons';
import { ROLE_LABELS, canManage } from './roles';

function ResetPasswordRow({ user, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError('6 caractères minimum');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateUser(user.id, { password });
      onDone(true);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="reset-password-row">
      <input
        type="password"
        placeholder="Nouveau mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        required
      />
      <button type="submit" className="btn btn--sm" disabled={saving}>{saving ? '…' : 'Valider'}</button>
      <button type="button" className="btn btn--sm btn--outline" onClick={() => onDone(false)}>Annuler</button>
      {error && <span className="admin-form__error" style={{ margin: 0 }}>{error}</span>}
    </form>
  );
}

function formatDate(value) {
  if (!value) return 'Jamais connecté';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function SessionsPanel({ userId, onForceLogout }) {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getUserSessions(userId).then(setSessions).catch((err) => setError(err.message));
  }, [userId]);

  if (error) return <div className="admin-empty">{error}</div>;
  if (!sessions) return <div className="admin-empty">Chargement…</div>;
  if (sessions.length === 0) return <div className="admin-empty">Aucune session active.</div>;

  return (
    <div className="sessions-panel">
      <table className="data-table data-table--compact">
        <thead>
          <tr><th>Adresse IP</th><th>Appareil</th><th>Connecté depuis</th><th>Dernière activité</th></tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.ip_address || '—'}</td>
              <td className="sessions-panel__ua">{s.user_agent || '—'}</td>
              <td>{formatDate(s.created_at)}</td>
              <td>{formatDate(s.last_seen_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn--sm btn--outline" onClick={onForceLogout}>
        <IconLogout /> Forcer la déconnexion ({sessions.length} session{sessions.length > 1 ? 's' : ''})
      </button>
    </div>
  );
}

export default function Journalists() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [error, setError] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [resetNotice, setResetNotice] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [sessionsKey, setSessionsKey] = useState(0);

  function load() {
    api.getUsers().then(setUsers);
  }

  useEffect(load, []);

  const manageableRoles = Object.keys(ROLE_LABELS).filter((r) => canManage(me?.role, r));
  const canCreate = manageableRoles.length > 0;

  async function onAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser(form);
      setForm({ name: '', email: '', password: '', role: manageableRoles[0] || 'user' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onRoleChange(id, role) {
    await api.updateUser(id, { role });
    load();
  }

  async function onToggleActive(u) {
    const label = u.is_active ? 'désactiver' : 'réactiver';
    if (!confirm(`Confirmer : ${label} le compte de ${u.name} ?`)) return;
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function onToggleDeveloper(u) {
    try {
      await api.updateUser(u.id, { is_developer: !u.is_developer });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm('Supprimer ce compte ?')) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function onForceLogout(u) {
    if (!confirm(`Déconnecter toutes les sessions actives de ${u.name} ?`)) return;
    try {
      await api.forceLogout(u.id);
      setSessionsKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  }

  function onResetDone(userName, success) {
    setResettingId(null);
    if (success) {
      setResetNotice(`Mot de passe de ${userName} réinitialisé.`);
      setTimeout(() => setResetNotice(null), 4000);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Utilisateurs et rôles</h1>
          <p className="admin-topbar__subtitle">Comptes ayant accès au tableau de bord</p>
        </div>
      </div>

      {resetNotice && <p className="admin-form__success">{resetNotice}</p>}

      {canCreate && (
        <form onSubmit={onAdd} className="admin-form" style={{ marginBottom: 24 }}>
          {error && <p className="admin-form__error">{error}</p>}
          <label>
            Nom
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Mot de passe
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label>
            Rôle
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {manageableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn"><IconPlus /> Créer le compte</button>
        </form>
      )}

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Comptes ({users.length})</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const manageable = canManage(me?.role, u.role);
              const isSelf = u.id === me.id;
              return (
                <Fragment key={u.id}>
                  <tr className={!u.is_active ? 'data-table__row--muted' : ''}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {manageable ? (
                        <select value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value)}>
                          {Object.keys(ROLE_LABELS)
                            .filter((r) => r === u.role || canManage(me?.role, r))
                            .map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                        </select>
                      ) : (
                        ROLE_LABELS[u.role] || u.role
                      )}
                      {me?.is_developer && (
                        <label className="dev-flag-toggle">
                          <input
                            type="checkbox"
                            checked={!!u.is_developer}
                            onChange={() => onToggleDeveloper(u)}
                          />
                          Développeur
                        </label>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge--ok">Actif</span>
                      ) : (
                        <span className="badge badge--muted">Désactivé</span>
                      )}
                    </td>
                    <td>{formatDate(u.last_seen_at)}</td>
                    <td>
                      {resettingId === u.id ? (
                        <ResetPasswordRow user={u} onDone={(success) => onResetDone(u.name, success)} />
                      ) : (
                        <div className="row-actions">
                          <button
                            onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                            title="Voir les sessions actives"
                          >
                            <IconChevronDown />
                          </button>
                          {(manageable || isSelf) && (
                            <button onClick={() => setResettingId(u.id)} title="Réinitialiser le mot de passe">
                              <IconLock />
                            </button>
                          )}
                          {manageable && (
                            <button
                              onClick={() => onToggleActive(u)}
                              title={u.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                            >
                              {u.is_active ? <IconBan /> : <IconRefresh />}
                            </button>
                          )}
                          {manageable && !isSelf && (
                            <button onClick={() => onDelete(u.id)} title="Supprimer"><IconTrash /></button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === u.id && (
                    <tr>
                      <td colSpan={6}>
                        <SessionsPanel key={sessionsKey} userId={u.id} onForceLogout={() => onForceLogout(u)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
