import { createContext, useContext, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cortex_user');
    return raw ? JSON.parse(raw) : null;
  });

  function applySession({ token, user }) {
    localStorage.setItem('cortex_token', token);
    localStorage.setItem('cortex_user', JSON.stringify(user));
    setUser(user);
  }

  async function login(email, password) {
    const res = await api.login(email, password);
    // Compte avec la 2FA activée : pas de session tant que le code n'est
    // pas vérifié — on renvoie tel quel pour que l'écran de connexion
    // affiche l'étape suivante au lieu de connecter directement.
    if (res.requiresTwoFactor) return res;
    applySession(res);
    return res;
  }

  function logout() {
    // On tente de révoquer la session côté serveur (best effort — la
    // déconnexion locale doit réussir même si l'appel échoue, ex. hors ligne).
    api.logout().catch(() => {});
    localStorage.removeItem('cortex_token');
    localStorage.removeItem('cortex_user');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout, applySession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
