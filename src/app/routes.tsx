import { createBrowserRouter, Navigate, useNavigate } from 'react-router';
import { PageState } from '../shared/components/PageState';
import { AdminLayout } from '../shared/components/AdminLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LeadsListPage } from '../features/crm/LeadsListPage';
import { LeadDetailPage } from '../features/crm/LeadDetailPage';
import { StudentsPage } from '../features/lms/StudentsPage';
import { StudentDetailPage } from '../features/lms/StudentDetailPage';
import { TeachersPage } from '../features/lms/TeachersPage';
import { CoursesPage } from '../features/lms/CoursesPage';
import { CourseDetailPage } from '@/features/lms/CourseDetail';
import { ClassesPage } from '../features/lms/ClassesPage';
import { ClassDetailPage } from '../features/lms/ClassDetailPage';
import { SessionDetailPage } from '../features/lms/SessionDetailPage';
import { SchedulePage } from '../features/lms/SchedulePage';
import { SchedulingPage } from '../features/lms/SchedulingPage';
import { MySchedulePage } from '../features/lms/MySchedulePage';
import { PaymentsPage } from '../features/finance/PaymentsPage';
import { InvoicesPage } from '../features/finance/InvoicesPage';
import { DebtsPage } from '../features/finance/DebtsPage';
import { AIPredictionsPage } from '../features/ai/AIPredictionsPage';
import { LoginPage } from '../features/auth/loginPage';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { RegisterPage } from '@/features/auth/registerPage';
import { RoomsPage } from '@/features/lms/RoomPage';
import { RoomDetailPage } from '@/features/lms/RoomDetailPage';

function NotFoundPage() {
  const navigate = useNavigate();
  return <PageState title="Không tìm thấy trang" description="Liên kết không tồn tại hoặc đã thay đổi."
    onBack={() => navigate('/dashboard', { replace: true })} backLabel="Về tổng quan" />;
}

function UnavailablePage() {
  const navigate = useNavigate();
  return <PageState title="Chức năng chưa được cung cấp" description="Vui lòng trở về tổng quan để tiếp tục làm việc."
    onBack={() => navigate('/dashboard', { replace: true })} backLabel="Về tổng quan" />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          {
            path: 'crm',
            element: <ProtectedRoute roles={['admin', 'sale']} />,
            children: [
              { index: true, element: <Navigate to="/crm/leads" replace /> },
              { path: 'leads', element: <LeadsListPage /> },
              { path: 'leads/:id', element: <LeadDetailPage /> },
            ],
          },
          {
            path: 'lms',
            children: [
              { index: true, element: <Navigate to="/lms/classes" replace /> },
              {
                element: <ProtectedRoute roles={['admin', 'sale', 'teacher']} />,
                children: [
                  { path: 'students', element: <StudentsPage /> },
                ],
              },
              {
                element: <ProtectedRoute roles={['admin', 'sale', 'teacher', 'student']} />,
                children: [{ path: 'students/:id', element: <StudentDetailPage /> }],
              },
              {
                element: <ProtectedRoute roles={['student']} />,
                children: [{ path: 'my-profile', element: <StudentDetailPage /> }],
              },
              {
                element: <ProtectedRoute roles={['admin']} />,
                children: [
                  { path: 'teachers', element: <TeachersPage /> },
                  { path: 'rooms', element: <RoomsPage /> },
                  { path: 'rooms/:id', element: <RoomDetailPage /> },
                  { path: 'schedule', element: <SchedulePage /> },
                  { path: 'scheduling', element: <SchedulingPage /> },
                ],
              },
              { path: 'courses', element: <CoursesPage /> },
              { path: 'courses/:id', element: <CourseDetailPage /> },
              { path: 'classes', element: <ClassesPage /> },
              { path: 'classes/:id', element: <ClassDetailPage /> },
              { path: 'sessions/:id', element: <SessionDetailPage /> },
              { path: 'myschedule', element: <MySchedulePage /> },
            ],
          },
          {
            path: 'finance',
            element: <ProtectedRoute roles={['admin', 'sale']} />,
            children: [
              { index: true, element: <Navigate to="/finance/invoices" replace /> },
              { path: 'invoices', element: <InvoicesPage /> },
              { path: 'payments', element: <PaymentsPage /> },
              { path: 'debts', element: <DebtsPage /> },
            ],
          },
          {
            path: 'ai',
            children: [
              { index: true, element: <Navigate to="/ai/predictions" replace /> },
              {
                element: <ProtectedRoute roles={['admin']} />,
                children: [
                  { path: 'models', element: <UnavailablePage /> },
                  { path: 'insights', element: <UnavailablePage /> },
                ],
              },
              {
                element: <ProtectedRoute roles={['admin', 'teacher']} />,
                children: [{ path: 'predictions', element: <AIPredictionsPage /> }],
              },
            ],
          },
          {
            path: 'settings',
            element: <ProtectedRoute roles={['admin']} />,
            children: [
              { index: true, element: <UnavailablePage /> },
              { path: 'users', element: <UnavailablePage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
