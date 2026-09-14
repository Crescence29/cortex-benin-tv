import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import Logo from '../components/Logo';
import './login.css';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
