import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import AdminLayout from './AdminLayout';
import { roleLabel } from './roles';

function TwoFactorPanel() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(null);
  const [setup, setSetup] = useState(null); // { secret, qrCodeDataUrl }
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.getUsers().then((users) => {
      const me = users.find((u) => u.id === user.id);
      setEnabled(me ? !!me.two_factor_enabled : null);
    });
  }

  useEffect(load, []);

  async function onStart() {
    setError(null);
    setBusy(true);
    try {
      setSetup(await api.startTwoFactorSetup());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.confirmTwoFactorSetup(code);
      setBackupCodes(res.backupCodes);
      setSetup(null);
      setCode('');
      setEnabled(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDisable(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.disableTwoFactor(disablePassword);
      setDisablePassword('');
      setEnabled(false);
      setBackupCodes(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null) return null;

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Double authentification (2FA)</h2>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {error && <p className="admin-form__error">{error}</p>}

        {backupCodes && (
          <div className="password-reset-result">
            <p>
              2FA activée. Note ces codes de secours maintenant — ils ne seront plus jamais affichés,
              et permettent de te connecter si tu perds l'accès à ton application d'authentification
              (chacun n'est utilisable qu'une seule fois).
            </p>
            <div className="password-reset-result__value" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              {backupCodes.map((c) => <code key={c}>{c}</code>)}
            </div>
            <button type="button" className="link-btn" onClick={() => setBackupCodes(null)}>J'ai noté ces codes</button>
          </div>
        )}

        {!backupCodes && enabled && (
          <form onSubmit={onDisable} style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', maxWidth: 320 }}>
            <p className="admin-empty" style={{ padding: 0, textAlign: 'left' }}>
              La 2FA est activée sur ton compte. Pour la désactiver, confirme ton mot de passe.
            </p>
            <input
              type="password"
              placeholder="Mot de passe actuel"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              required
            />
            <button type="submit" className="btn btn--sm btn--outline" disabled={busy}>Désactiver la 2FA</button>
          </form>
        )}

        {!backupCodes && !enabled && !setup && (
          <div>
            <p className="admin-empty" style={{ padding: 0, textAlign: 'left', marginBottom: 12 }}>
              La 2FA n'est pas activée sur ton compte. Une fois activée, une application comme Google
              Authenticator ou Authy sera nécessaire pour te connecter, en plus de ton mot de passe.
            </p>
            <button type="button" className="btn btn--sm" onClick={onStart} disabled={busy}>Activer la 2FA</button>
          </div>
        )}

        {!backupCodes && !enabled && setup && (
          <form onSubmit={onConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <p className="admin-empty" style={{ padding: 0, textAlign: 'left' }}>
              Scanne ce QR code avec ton application d'authentification, puis entre le code à 6 chiffres généré.
            </p>
            <img src={setup.qrCodeDataUrl} alt="QR code 2FA" style={{ width: 180, height: 180, background: '#fff', padding: 8, borderRadius: 8 }} />
            <p className="admin-empty" style={{ padding: 0, textAlign: 'left' }}>
              Impossible de scanner ? Saisis ce code manuellement : <code>{setup.secret}</code>
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code à 6 chiffres"
              autoFocus
              required
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn--sm" disabled={busy}>Confirmer</button>
              <button type="button" className="btn btn--sm btn--outline" onClick={() => { setSetup(null); setCode(''); }}>Annuler</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

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
          <p className="admin-topbar__subtitle">Compte connecté : {user?.name} ({user?.is_developer ? 'Développeur' : roleLabel(user?.role)})</p>
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

      <TwoFactorPanel />
    </AdminLayout>
  );
}
