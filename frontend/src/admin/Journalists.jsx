import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import AdminLayout from './AdminLayout';
import { IconTrash, IconPlus, IconLock } from '../components/Icons';

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

export default function Journalists() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'editor' });
  const [error, setError] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [resetNotice, setResetNotice] = useState(null);
  const isAdmin = me?.role === 'admin';

  function load() {
    api.getUsers().then(setUsers);
  }

  useEffect(load, []);

  async function onAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.createUser(form);
      setForm({ name: '', email: '', password: '', role: 'editor' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onRoleChange(id, role) {
    await api.updateUser(id, { role });
    load();
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
          <h1>Journalistes</h1>
          <p className="admin-topbar__subtitle">Comptes ayant accès au tableau de bord</p>
        </div>
      </div>

      {resetNotice && <p className="admin-form__success">{resetNotice}</p>}

      {isAdmin && (
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
              <option value="editor">Journaliste</option>
              <option value="admin">Administrateur</option>
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
            <tr><th>Nom</th><th>Email</th><th>Rôle</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  {isAdmin ? (
                    <select value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value)}>
                      <option value="editor">Journaliste</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  ) : (
                    u.role === 'admin' ? 'Administrateur' : 'Journaliste'
                  )}
                </td>
                <td>
                  {isAdmin && resettingId === u.id ? (
                    <ResetPasswordRow user={u} onDone={(success) => onResetDone(u.name, success)} />
                  ) : (
                    isAdmin && (
                      <div className="row-actions">
                        <button onClick={() => setResettingId(u.id)} title="Réinitialiser le mot de passe">
                          <IconLock />
                        </button>
                        {u.id !== me.id && (
                          <button onClick={() => onDelete(u.id)} title="Supprimer"><IconTrash /></button>
                        )}
                      </div>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
