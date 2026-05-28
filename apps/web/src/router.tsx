/**
 * Social Planner - Router Configuration
 *
 * Application routing using React Router v6 with createBrowserRouter.
 */

import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  Dashboard,
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
  AuthCallback,
  AcceptInvitation,
  NotFound,
  Posts,
  PostEditor,
  Articles,
  ArticleEditor,
  Calendar,
  Media,
  Accounts,
  Users,
  Settings,
  SharedCalendar,
  AmbassadorQueue,
  Analytics,
  Feedback,
} from '@/pages';

export const router = createBrowserRouter([
  // Public routes - Authentication
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmail />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/auth/error',
    element: <Login />, // Login page handles auth errors via query params
  },
  {
    path: '/accept-invite/:token',
    element: <AcceptInvitation />,
  },

  // Public shared calendar
  {
    path: '/shared/:token',
    element: <SharedCalendar />,
  },

  // Protected routes with layout
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'posts',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <Posts />
          </ProtectedRoute>
        ),
      },
      {
        path: 'posts/new',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <PostEditor />
          </ProtectedRoute>
        ),
      },
      {
        path: 'posts/:id',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <PostEditor />
          </ProtectedRoute>
        ),
      },
      {
        path: 'articles',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <Articles />
          </ProtectedRoute>
        ),
      },
      {
        path: 'articles/new',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <ArticleEditor />
          </ProtectedRoute>
        ),
      },
      {
        path: 'articles/:id',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <ArticleEditor />
          </ProtectedRoute>
        ),
      },
      {
        path: 'calendar',
        element: <Calendar />,
      },
      {
        path: 'media',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <Media />
          </ProtectedRoute>
        ),
      },
      {
        path: 'accounts',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <Accounts />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <Users />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'ambassador',
        element: <AmbassadorQueue />,
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute requiredRole={['ADMIN', 'EDITOR']}>
            <Analytics />
          </ProtectedRoute>
        ),
      },
      {
        path: 'feedback',
        element: <Feedback />,
      },
    ],
  },

  // 404 catch-all
  {
    path: '*',
    element: <NotFound />,
  },
]);
