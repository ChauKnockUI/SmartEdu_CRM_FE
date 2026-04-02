import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'sale' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void; // For demo purposes
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<UserRole, User> = {
  admin: {
    id: '1',
    name: 'Admin User',
    email: 'admin@educrm.com',
    role: 'admin',
  },
  sale: {
    id: '2',
    name: 'Sale User',
    email: 'sale@educrm.com',
    role: 'sale',
  },
  teacher: {
    id: '3',
    name: 'Teacher User',
    email: 'teacher@educrm.com',
    role: 'teacher',
  },
  student: {
    id: '4',
    name: 'Student User',
    email: 'student@educrm.com',
    role: 'student',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default to admin for demo
  const [user, setUser] = useState<User | null>(mockUsers.admin);

  const login = async (email: string, password: string) => {
    // Mock login - in production this would call Supabase
    const role = email.split('@')[0] as UserRole;
    if (mockUsers[role]) {
      setUser(mockUsers[role]);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    setUser(mockUsers[role]);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || 'admin', login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
