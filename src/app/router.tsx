import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { AuthCallbackPage } from '../features/auth/pages/AuthCallbackPage';
import { PendingApprovalPage } from '../features/auth/pages/PendingApprovalPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { RecommendationsPage } from '../features/recommendations/RecommendationsPage';
import { CourseListPage } from '../features/courses/CourseListPage';
import { TrainingRecordsPage } from '../features/training-records/TrainingRecordsPage';
import { ProfilePage } from '../features/personnel/ProfilePage';
import { PersonnelListPage } from '../features/personnel/PersonnelListPage';
import { IndividualProfilePage } from '../features/personnel/IndividualProfilePage';
import { SelfServicePage } from '../features/self-service/SelfServicePage';
import { GuestRoute } from '../components/auth/GuestRoute';
import { ReportsPage } from '../features/reports/ReportsPage';
import { UserManagementPage } from '../features/admin/UserManagementPage';
import { SecurityPage } from '../features/admin/SecurityPage';
import { ForbiddenPage } from '../features/system/ForbiddenPage';
import { NotFoundPage } from '../features/system/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
    ],
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin', 'executive', 'hr', 'personnel']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/self-service',
            element: <SelfServicePage />,
          },
          {
            path: '/pending-approval',
            element: <PendingApprovalPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin', 'executive', 'hr']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/analytics',
            element: <AnalyticsPage />,
          },
          {
            path: '/recommendations',
            element: <RecommendationsPage />,
          },
          {
            path: '/courses',
            element: <CourseListPage />,
          },
          {
            path: '/records',
            element: <TrainingRecordsPage />,
          },
          {
            path: '/personnel',
            element: <PersonnelListPage />,
          },
          {
            path: '/personnel/:id',
            element: <IndividualProfilePage />,
          },
          {
            path: '/reports',
            element: <ReportsPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin', 'admin']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/admin/users',
            element: <UserManagementPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['super_admin']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/admin/security',
            element: <SecurityPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
