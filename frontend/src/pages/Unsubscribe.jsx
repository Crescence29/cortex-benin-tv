import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { IconMail } from '../components/Icons';
import './unsubscribe.css';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Désabonnement — Cortex Bénin TV';
    return () => {
      document.title = 'Cortex Bénin TV';
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus('sending');
    try {
      await api.unsubscribeNewsletter(email);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  return (
    <div className="unsub-page">
      <div className="unsub-card">
        <span className="unsub-icon"><IconMail /></span>
        <h1>Se désabonner de la newsletter</h1>

        {status === 'done' ? (
          <>
            <p className="unsub-success">Vous avez bien été désabonné. Vous ne recevrez plus nos emails.</p>
            <Link to="/" className="unsub-btn">Retour à l'accueil</Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <p>Indiquez l'adresse email que vous souhaitez retirer de notre liste de diffusion.</p>
            {error && <p className="unsub-error">{error}</p>}
            <input
              type="email"
              required
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="unsub-btn" disabled={status === 'sending'}>
              {status === 'sending' ? 'Envoi…' : 'Me désabonner'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
