import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import api, { setAccessToken } from '../lib/api';

export type Role = 'customer' | 'staff' | 'admin';

export const ROLE_HOME: Record<Role, string> = {
  customer: '/',
  staff: '/admin',
  admin: '/admin',
};

interface User {
  _id: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;
  signIn: (taiKhoan: string, matKhau: string) => Promise<Role>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  // tải lại trang: xin access token mới từ refresh token (cookie), rồi lấy thông tin người dùng
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        const me = await api.get('/me');
        setUser(me.data.user);
        setRole(me.data.role);
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const signIn = async (TaiKhoan: string, MatKhau: string) => {
    const { data } = await api.post('/auth/signIn', { TaiKhoan, MatKhau });
    setAccessToken(data.accessToken);
    const me = await api.get('/me');
    setUser(me.data.user);
    setRole(me.data.role);
    return me.data.role as Role;
  };

  const signOut = async () => {
    try {
      await api.post('/auth/signOut');
    } finally {
      setAccessToken(null);
      setUser(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
