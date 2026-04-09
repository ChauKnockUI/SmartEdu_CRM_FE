import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  // ⏳ đang check login
  if (loading) {
    return <div>Loading...</div>;
  }

  // ❌ chưa login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ✅ đã login
  return <Outlet />;
}