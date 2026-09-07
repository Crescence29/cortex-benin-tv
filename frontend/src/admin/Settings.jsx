import { useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import AdminLayout from './AdminLayout';

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Paramètres</h1>
          <p className="admin-topbar__subtitle">Compte connecté : {user?.name} ({user?.role === 'admin' ? 'Administrateur' : 'Journaliste'})</p>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Changer le mot de passe</h2>
        </div>
        <form onSubmit={onSubmit} className="admin-form" style={{ boxShadow: 'none', margin: 20 }}>
          {error && <p className="admin-form__error">{error}</p>}
          {saved && <p className="admin-form__success">Mot de passe mis à jour.</p>}
          <label>
            Mot de passe actuel
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label>
            Nouveau mot de passe
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </label>
          <label>
            Confirmer le nouveau mot de passe
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </label>
          <button type="submit" className="btn">Mettre à jour</button>
        </form>
      </div>
    </AdminLayout>
  );
}
