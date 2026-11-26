import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/types';
import { api } from '@/api';
import { getToken, setToken, setStoredUser, getStoredUser } from '@/api/config';
import { can as canFn, type PermissionKey } from './permissions';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: PermissionKey) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (token && stored) {
      try { setUser(JSON.parse(stored) as User); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, token } = await api.login(email, password);
    setToken(token);
    setStoredUser(JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await api.logout(user);
    setToken(null);
    setStoredUser(null);
    setUser(null);
  }, [user]);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const u = await api.me(token);
    if (u) { setStoredUser(JSON.stringify(u)); setUser(u); }
  }, []);

  const can = useCallback((perm: PermissionKey) => (user ? canFn(user.role, perm) : false), [user]);

  const value = useMemo<AuthContextValue>(() => ({ user, loading, login, logout, can, refreshUser }), [user, loading, login, logout, can, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
