/**
 * Social Planner - App Component
 *
 * Root application component with providers.
 */

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AnimatedToaster } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import type { User } from '@/stores/authStore';

function AuthInitializer() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get<User>('/users/me');
        setUser(data);
      } catch {
        // Token invalid or expired
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    };

    initAuth();
  }, [setUser, setLoading]);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <RouterProvider router={router} />
      <AnimatedToaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
