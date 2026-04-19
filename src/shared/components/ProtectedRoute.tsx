import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user!.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <Outlet />;
}