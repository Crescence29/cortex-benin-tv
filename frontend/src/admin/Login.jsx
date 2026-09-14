import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api';
import Logo from '../components/Logo';
import './login.css';

export default function Login() {
  const { login, applySession } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.requiresTwoFactor) {
        setTempToken(res.tempToken);
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyCode(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await api.verifyTwoFactorLogin(tempToken, code);
      applySession(session);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (tempToken) {
    return (
      <div className="login-page">
        <span className="login-page__glow login-page__glow--1" />
        <span className="login-page__glow login-page__glow--2" />
        <form onSubmit={onVerifyCode} className="login-card">
          <div className="login-card__logo">
            <Logo imgAlt="Cortex Bénin TV" textClassName="brand-text-logo" />
          </div>
          <h1 className="login-card__title">Code de vérification</h1>
          <p className="login-card__subtitle">
            Entre le code à 6 chiffres de ton application d'authentification, ou un code de secours.
          </p>

          {error && <p className="login-card__error">{error}</p>}

          <div className="login-field">
            <label htmlFor="login-2fa-code">Code</label>
            <input
              id="login-2fa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoFocus
              required
            />
          </div>

          <button type="submit" className="login-card__submit" disabled={loading}>
            {loading ? '…' : 'Vérifier'}
          </button>

          <p className="login-card__back">
            <button type="button" className="link-btn" onClick={() => { setTempToken(null); setCode(''); setError(null); }}>
              ← Revenir à la connexion
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="login-page">
      <span className="login-page__glow login-page__glow--1" />
      <span className="login-page__glow login-page__glow--2" />

      <form onSubmit={onSubmit} className="login-card">
        <div className="login-card__logo">
          <Logo imgAlt="Cortex Bénin TV" textClassName="brand-text-logo" />
        </div>
        <h1 className="login-card__title">{t('connexion_admin')}</h1>
        <p className="login-card__subtitle">Espace réservé à l'équipe de Cortex Bénin TV</p>

        {error && <p className="login-card__error">{error}</p>}

        <div className="login-field">
          <label htmlFor="login-email">{t('email')}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@cortexbenintv.bj"
            required
            autoFocus
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">{t('mot_de_passe')}</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="login-card__submit" disabled={loading}>
          {loading ? '…' : t('se_connecter')}
        </button>

        <p className="login-card__back">
          <Link to="/">← Retour au site</Link>
        </p>
      </form>
    </div>
  );
}
