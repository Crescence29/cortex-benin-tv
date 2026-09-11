import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { ROLE_LABELS } from './roles';

function formatDate(value) {
  if (!value) return 'Jamais connecté';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Journalists() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getUsers().then(setUsers);
  }, []);

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Journalistes</h1>
          <p className="admin-topbar__subtitle">Liste des comptes ayant accès au tableau de bord</p>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Comptes ({users.length})</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Dernière connexion</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={!u.is_active ? 'data-table__row--muted' : ''}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.role] || u.role}</td>
                <td>{formatDate(u.last_seen_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
