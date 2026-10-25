import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('as_user')); } catch { return null; }
  });
  const [token, setToken]   = useState(() => localStorage.getItem('as_token'));

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('as_token', data.token);
    localStorage.setItem('as_user',  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('as_token', data.token);
    localStorage.setItem('as_user',  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async ({ email, name, googleId, avatar }) => {
    const { data } = await api.post('/auth/google', { email, name, googleId, avatar });
    localStorage.setItem('as_token', data.token);
    localStorage.setItem('as_user',  JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('as_token');
    localStorage.removeItem('as_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, loginWithGoogle, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
