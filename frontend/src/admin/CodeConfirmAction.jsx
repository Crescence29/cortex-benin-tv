import { useState } from 'react';

// Bouton générique pour une action sensible confirmée par un code à 6
// chiffres généré côté serveur (accès développeur, bannissement,
// débannissement, connexion en tant qu'un autre compte).
export default function CodeConfirmAction({ buttonLabel, buttonIcon: Icon, buttonClassName, confirmText, onStart, onConfirm, onDone }) {
  const [pending, setPending] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setError(null);
    setBusy(true);
    try {
      const res = await onStart();
      setPending(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onConfirm(input);
      setPending(null);
      setInput('');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!pending) {
    return (
      <button type="button" className={buttonClassName || 'btn btn--sm btn--outline'} onClick={handleStart} disabled={busy}>
        {Icon && <Icon />} {buttonLabel}
      </button>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="dev-access-confirm">
      <p>
        Code de confirmation généré : <strong>{pending.code}</strong>
        <br />
        {confirmText(pending)}
      </p>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Code à 6 chiffres"
        autoFocus
        required
      />
      <button type="submit" className="btn btn--sm" disabled={busy}>Confirmer</button>
      <button type="button" className="btn btn--sm btn--outline" onClick={() => { setPending(null); setInput(''); setError(null); }}>
        Annuler
      </button>
      {error && <span className="admin-form__error" style={{ margin: 0 }}>{error}</span>}
    </form>
  );
}
