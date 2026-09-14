import { createContext, useContext, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cortex_user');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('cortex_token', token);
    localStorage.setItem('cortex_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    // On tente de révoquer la session côté serveur (best effort — la
    // déconnexion locale doit réussir même si l'appel échoue, ex. hors ligne).
    api.logout().catch(() => {});
    localStorage.removeItem('cortex_token');
    localStorage.removeItem('cortex_user');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
