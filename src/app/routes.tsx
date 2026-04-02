import { createBrowserRouter, Navigate } from 'react-router';
import { AdminLayout } from '../shared/components/AdminLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LeadsListPage } from '../features/crm/LeadsListPage';
import { LeadDetailPage } from '../features/crm/LeadDetailPage';
import { StudentsPage } from '../features/lms/StudentsPage';
import { StudentDetailPage } from '../features/lms/StudentDetailPage';
import { TeachersPage } from '../features/lms/TeachersPage';
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

export const router = createBrowserRouter([
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
      // CRM Routes
      {
        path: 'crm',
        children: [
          {
            index: true,
            element: <Navigate to="/crm/leads" replace />,
          },
          {
            path: 'leads',
            element: <LeadsListPage />,
          },
          {
            path: 'leads/:id',
            element: <LeadDetailPage />,
          },
        ],
      },
      // LMS Routes
      {
        path: 'lms',
        children: [
          {
            index: true,
            element: <Navigate to="/lms/students" replace />,
          },
          {
            path: 'students',
            element: <StudentsPage />,
          },
          {
            path: 'students/:id',
            element: <StudentDetailPage />,
          },
          {
            path: 'teachers',
            element: <TeachersPage />,
          },
          {
            path: 'classes',
            element: <ClassesPage />,
          },
          {
            path: 'classes/:id',
            element: <ClassDetailPage />,
          },
          {
            path: 'sessions/:id',
            element: <SessionDetailPage />,
          },
          {
            path: 'schedule',
            element: <SchedulePage />,
          },
          {
            path: 'scheduling',
            element: <SchedulingPage />,
          },
          {
            path: 'myschedule',
            element: <MySchedulePage />,
          },
        ],
      },
      // Finance Routes
      {
        path: 'finance',
        children: [
          {
            index: true,
            element: <Navigate to="/finance/payments" replace />,
          },
          {
            path: 'payments',
            element: <PaymentsPage />,
          },
        ],
      },
      // AI Routes
      {
        path: 'ai',
        children: [
          {
            index: true,
            element: <Navigate to="/ai/models" replace />,
          },
          {
            path: 'models',
            element: <AIModelsPage />,
          },
          {
            path: 'predictions',
            element: <AIPredictionsPage />,
          },
          {
            path: 'insights',
            element: <AIInsightsPage />,
          },
        ],
      },
      // Settings Routes
      {
        path: 'settings',
        children: [
          {
            index: true,
            element: <Navigate to="/settings/users" replace />,
          },
          {
            path: 'users',
            element: <UsersPage />,
          },
        ],
      },
      // 404
      {
        path: '*',
        element: <div className="text-center p-8">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-gray-600">Trang không tồn tại</p>
        </div>,
      },
    ],
  },
]);