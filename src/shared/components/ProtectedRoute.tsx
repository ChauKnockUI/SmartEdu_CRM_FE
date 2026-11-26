import { Navigate, Outlet, useNavigate } from 'react-router';
import { PageState } from './PageState';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <PageState loading title="Đang xác nhận phiên đăng nhập..." />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user!.role)) {
    return <PageState title="Bạn không có quyền truy cập trang này" description="Vui lòng liên hệ quản trị viên trung tâm nếu cần hỗ trợ."
      onBack={() => navigate('/dashboard', { replace: true })} backLabel="Về tổng quan" />;
  }

  return <Outlet />;
}
