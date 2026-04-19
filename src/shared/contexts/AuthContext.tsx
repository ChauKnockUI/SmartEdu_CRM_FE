import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { authService } from '@/services/api/auth.service';

export type UserRole = 'admin' | 'sale' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (user: User, token: string) => {
  setUser(user);
  setToken(token);
  localStorage.setItem('token', token);
};

const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
  const savedToken = localStorage.getItem('token');

  if (!savedToken) {
    setLoading(false);
    return;
  }

  authService.getMe(savedToken)
  .then((data) => {
    const u = data.data.user;

    setUser({
      id: u.id,
      name: u.full_name,
      email: u.email,
      role: u.role,
    });

    setToken(savedToken);
  })
  .catch(() => {
    logout(); // 🔥 QUAN TRỌNG
  })
  .finally(() => setLoading(false));
}, 
[]);
  

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}