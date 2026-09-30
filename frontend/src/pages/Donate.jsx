import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconHeart, IconCheck } from '../components/Icons';
import './donate.css';

// Clé PUBLIQUE FedaPay — sûre à exposer côté client par conception (c'est
// tout le principe de Checkout.js : la clé secrète, elle, ne quitte jamais
// le dashboard FedaPay et n'apparaît nulle part dans ce code).
const FEDAPAY_PUBLIC_KEY = import.meta.env.VITE_FEDAPAY_PUBLIC_KEY || 'pk_live_KHLQ6gGSDCBFfZIsW_cnCbgF';
const CHECKOUT_SCRIPT_URL = 'https://cdn.fedapay.com/checkout.js?v=1.1.7';
const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 25000];

// FedaPay.init() ne s'insère pas *dans* l'élément cible : il le remplace
// carrément dans le DOM par son propre bouton. Un ref stable réutilisé entre
// deux appels pointerait donc vers un nœud déjà détaché. Solution : cette
// sous-vue est remontée (via `key`) à chaque changement de montant/email,
// ce qui garantit à FedaPay un nœud neuf, toujours attaché, à chaque appel.
function DonateButton({ amount, onComplete }) {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current || !window.FedaPay) return;
    window.FedaPay.init(hostRef.current, {
      public_key: FEDAPAY_PUBLIC_KEY,
      transaction: {
        amount,
        description: 'Don à Cortex Bénin TV',
        currency: 'XOF',
      },
      button: { text: `Faire un don de ${amount} FCFA`, class: 'donate-fedapay-btn' },
      onComplete,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  return <div ref={hostRef} className="donate-fedapay-host" />;
}

export default function Donate() {
  const [amount, setAmount] = useState(2500);
  const [customAmount, setCustomAmount] = useState('');
  const [scriptReady, setScriptReady] = useState(!!window.FedaPay);
  const [status, setStatus] = useState(null); // null | 'success' | 'cancelled'

  useEffect(() => {
    if (window.FedaPay) {
      setScriptReady(true);
      return;
    }
    let cancelled = false;
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => { if (!cancelled) setScriptReady(true); };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, []);

  const rawAmount = customAmount ? Number(customAmount) : amount;
  const effectiveAmount = Number.isFinite(rawAmount) && rawAmount >= 100 ? Math.round(rawAmount) : null;

  function handleComplete({ reason }) {
    if (reason === window.FedaPay.CHECKOUT_COMPLETED) setStatus('success');
    else if (reason === window.FedaPay.DIALOG_DISMISSED) setStatus('cancelled');
  }

  return (
    <div className="donate-page">
      <section className="donate-hero">
        <div className="donate-hero__overlay" />
        <div className="container donate-hero__content">
          <span className="donate-hero__icon"><IconHeart /></span>
          <h1>Soutenez Cortex Bénin TV</h1>
          <p>
            Un média béninois indépendant, qui informe 24h/24 et 7j/7, ça se construit avec vous.
            Votre don, même modeste, nous aide à produire une information de qualité.
          </p>
        </div>
      </section>

      <section className="container donate-section">
        {status === 'success' ? (
          <div className="donate-success">
            <span className="donate-success__icon"><IconCheck /></span>
            <h2>Merci infiniment !</h2>
            <p>Votre don a bien été reçu. Il fait une vraie différence pour notre rédaction.</p>
            <Link to="/" className="donate-success__link">Retour à l'accueil</Link>
          </div>
        ) : (
          <div className="donate-card">
            <h2>Choisissez un montant</h2>
            <div className="donate-amounts">
              {PRESET_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={'donate-amounts__btn' + (!customAmount && amount === v ? ' is-active' : '')}
                  onClick={() => { setAmount(v); setCustomAmount(''); }}
                >
                  {v.toLocaleString('fr-FR')} FCFA
                </button>
              ))}
            </div>

            <label className="donate-field">
              Ou un autre montant (FCFA)
              <input
                type="number"
                min="100"
                step="100"
                placeholder="Ex : 3000"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </label>

            {status === 'cancelled' && (
              <p className="donate-cancelled">Le don a été annulé. Vous pouvez réessayer quand vous voulez.</p>
            )}

            {!effectiveAmount && (
              <p className="donate-hint">Montant minimum : 100 FCFA.</p>
            )}

            {scriptReady && effectiveAmount ? (
              <DonateButton key={effectiveAmount} amount={effectiveAmount} onComplete={handleComplete} />
            ) : (
              !scriptReady && <p className="donate-hint">Chargement du module de paiement…</p>
            )}

            <p className="donate-secure">Paiement sécurisé par FedaPay — Mobile Money (MTN, Moov) et carte bancaire acceptés.</p>
          </div>
        )}
      </section>
    </div>
  );
}
