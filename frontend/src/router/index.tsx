import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/Layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Batches from '@/pages/Batches';
import Printing from '@/pages/Printing';
import Escort from '@/pages/Escort';
import ExamSite from '@/pages/ExamSite';
import Exceptions from '@/pages/Exceptions';
import Recovery from '@/pages/Recovery';
import { UserRole } from '@/types';
import { Box, CircularProgress } from '@mui/material';

const RootLayout: React.FC = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

const FullPageLoader: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppLayoutWithOutlet: React.FC = () => {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        index: true,
        element: <RootRedirect />,
      },
      {
        element: (
          <ProtectedRoute>
            <AppLayoutWithOutlet />
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'batches',
            element: (
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PROPOSITION_CENTER]}>
                <Batches />
              </ProtectedRoute>
            ),
          },
          {
            path: 'printing',
            element: (
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PRINTING_FACTORY]}>
                <Printing />
              </ProtectedRoute>
            ),
          },
          {
            path: 'escort',
            element: (
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.ESCORT]}>
                <Escort />
              </ProtectedRoute>
            ),
          },
          {
            path: 'exam-site',
            element: (
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EXAM_SITE]}>
                <ExamSite />
              </ProtectedRoute>
            ),
          },
          {
            path: 'exceptions',
            element: <Exceptions />,
          },
          {
            path: 'recovery',
            element: (
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EXAM_SITE]}>
                <Recovery />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
