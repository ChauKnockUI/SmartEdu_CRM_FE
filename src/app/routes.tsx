import { createBrowserRouter, Navigate } from 'react-router';
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
import { AIModelsPage } from '../features/ai/AIModelsPage';
import { AIPredictionsPage } from '../features/ai/AIPredictionsPage';
import { AIInsightsPage } from '../features/ai/AIInsightsPage';
import { UsersPage } from '../features/settings/UsersPage';
import { LoginPage } from '../features/auth/loginPage';
import { ProtectedRoute } from '../shared/components/ProtectedRoute';
import { RegisterPage } from '@/features/auth/registerPage';

export const router = createBrowserRouter([
  // ✅ PUBLIC ROUTE
  {
    path: '/login',
    element: <LoginPage />,
  },

  {
    path: '/register',
    element: <RegisterPage />,
  },

  // 🔒 PRIVATE ROUTE
  {
    element: <ProtectedRoute />, // 👈 CHẶN Ở ĐÂY
    children: [
      {
        path: '/',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },

          // CRM
          {
            path: 'crm',
            children: [
              {
                index: true,
                element: <Navigate to="/crm/leads" replace />,
              },
              {
                element: <ProtectedRoute roles={['admin', 'sale']} />,
                children: [
                  { path: 'leads', element: <LeadsListPage /> },
                ],
              },
              {
                path: 'leads/:id',
                element: <LeadDetailPage />,
              },
            ],
          },

          // LMS
          {
            path: 'lms',
            children: [
              {
                index: true,
                element: <Navigate to="/lms/students" replace />,
              },
              { path: 'students', element: <StudentsPage /> },
              { path: 'students/:id', element: <StudentDetailPage /> },
              { path: 'teachers', element: <TeachersPage /> },
              { path: 'courses', element: <CoursesPage /> },
              { path: 'courses/:id', element: <CourseDetailPage /> },
              { path: 'classes', element: <ClassesPage /> },
              { path: 'classes/:id', element: <ClassDetailPage /> },
              { path: 'sessions/:id', element: <SessionDetailPage /> },
              { path: 'schedule', element: <SchedulePage /> },
              { path: 'scheduling', element: <SchedulingPage /> },
              { path: 'myschedule', element: <MySchedulePage /> },
            ],
          },

          // Finance
          {
            path: 'finance',
            children: [
              {
                index: true,
                element: <Navigate to="/finance/payments" replace />,
              },
              { path: 'payments', element: <PaymentsPage /> },
            ],
          },

          // AI
          {
            path: 'ai',
            children: [
              {
                index: true,
                element: <Navigate to="/ai/models" replace />,
              },
              { path: 'models', element: <AIModelsPage /> },
              { path: 'predictions', element: <AIPredictionsPage /> },
              { path: 'insights', element: <AIInsightsPage /> },
            ],
          },

          // Settings
          {
            path: 'settings',
            children: [
              {
                index: true,
                element: <Navigate to="/settings/users" replace />,
              },
              { path: 'users', element: <UsersPage /> },
            ],
          },

          // 404
          {
            path: '*',
            element: <div>404</div>,
          },
        ],
      },
    ],
  },
]);