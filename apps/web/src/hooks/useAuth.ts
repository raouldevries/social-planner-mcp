/**
 * Social Planner - Auth Hooks
 *
 * Custom hooks for authentication operations using TanStack Query.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '@/lib/api';
import { useAuthStore, type User } from '@/stores/authStore';
import toast from 'react-hot-toast';

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

/**
 * Hook to fetch current user profile
 *
 * Note: This hook returns the query result. State updates are handled
 * by the AuthInitializer component in App.tsx. Use this hook when you
 * need to refetch or access the query state directly.
 */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const { data } = await api.get<User>('/users/me');
      return data;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for login mutation
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await api.post<AuthResponse>('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success('Welcome back!');
      navigate('/');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook for registration mutation
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const { data: response } = await api.post<AuthResponse>('/auth/register', data);
      return response;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success('Account created successfully!');
      navigate('/');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
      navigate('/login');
      toast.success('Logged out successfully');
    },
    onError: () => {
      // Even if API call fails, clear local state
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}

/**
 * Hook for password change mutation
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await api.post('/users/me/change-password', data);
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook for forgot password (initiate reset)
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post('/auth/forgot-password', { email });
    },
    onSuccess: () => {
      toast.success(
        'If an account exists with that email, you will receive a password reset link.'
      );
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook for resetting password with token
 */
export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      await api.post('/auth/reset-password', data);
    },
    onSuccess: () => {
      toast.success('Password reset successfully. Please sign in with your new password.');
      navigate('/login');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook for verifying email
 */
export function useVerifyEmail() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (token: string) => {
      await api.post('/auth/verify-email', { token });
    },
    onSuccess: () => {
      toast.success('Email verified successfully!');
      navigate('/');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    },
  });
}

/**
 * Hook for handling OAuth callback
 */
export function useOAuthCallback() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (params: { accessToken: string; refreshToken: string }) => {
      // Store tokens
      localStorage.setItem('accessToken', params.accessToken);
      localStorage.setItem('refreshToken', params.refreshToken);
      // Fetch user data
      const { data } = await api.get<User>('/users/me');
      return data;
    },
    onSuccess: (user) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success('Welcome!');
      navigate('/');
    },
    onError: (error) => {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      navigate('/login');
    },
  });
}
