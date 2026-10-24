import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore, type PlatformAdmin } from './api';

type Status = 'loading' | 'authed' | 'anon';

interface AuthValue {
  status: Status;
  admin: PlatformAdmin | null;
  /** Thông báo hiển thị ở màn hình đăng nhập (ví dụ phiên hết hạn). */
  notice: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(tokenStore.get() ? 'loading' : 'anon');
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setAdmin(null);
    setStatus('anon');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setAdmin(null);
      setStatus('anon');
      setNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me()
      .then((a) => { setAdmin(a); setStatus('authed'); })
      .catch(() => { tokenStore.clear(); setStatus('anon'); });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    tokenStore.set(res.token);
    setAdmin(res.admin);
    setNotice(null);
    setStatus('authed');
  }, []);

  const value = useMemo(() => ({ status, admin, notice, login, logout }), [status, admin, notice, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlatformAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlatformAuth phải nằm trong PlatformAuthProvider');
  return v;
}
