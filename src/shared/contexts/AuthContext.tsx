import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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

  // useEffect(() => {
  //   const savedToken = localStorage.getItem('token');

  //   if (!token) {
  //     setLoading(false); // ✅ QUAN TRỌNG
  //     return;
  //   }

  //   if (savedToken) {
  //     setToken(savedToken);

  //     // ✅ gọi API /me để lấy user
  //     fetch('http://localhost:3000/api/auth/me', {
  //       headers: {
  //         Authorization: `Bearer ${savedToken}`,
  //       },
  //     })
  //       .then(res => res.json())
  //       .then(data => {
  //         if (data?.data?.user) {
  //           const u = data.data.user;

  //           setUser({
  //             id: u.id,
  //             name: u.full_name,
  //             email: u.email,
  //             role: u.role,
  //             avatar: u.avatar_url,
  //           });
  //         }
  //       })
  //       .catch(() => {
  //         logout();
  //       })
  //       .finally(() => {
  //         setLoading(false);
  //       });
  //   }
  // }, []);
  useEffect(() => {
    const savedToken = localStorage.getItem('token');

    if (savedToken) {
      setToken(savedToken);
    }

    setLoading(false); // ✅ luôn tắt loading
  }, []);

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('token', token);
  };

  // ✅ logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

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