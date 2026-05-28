/**
 * Social Planner - API Client
 *
 * Axios-based HTTP client for communicating with the backend API.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// API base URL - uses Vite proxy in development
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - adds auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Shared promise to prevent concurrent refresh attempts from racing
let refreshPromise: Promise<string> | null = null;

function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    return Promise.reject(new Error('No refresh token'));
  }

  return axios
    .post<{
      accessToken: string;
      refreshToken: string;
    }>(`${API_URL}/auth/refresh`, { refreshToken }, { withCredentials: true })
    .then(({ data }) => {
      if (!data.accessToken || !data.refreshToken) {
        throw new Error('Malformed refresh response');
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken;
    });
}

// Response interceptor - handles token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Serialize concurrent refresh attempts — all 401s share one in-flight refresh
        if (!refreshPromise) {
          refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch {
        // Refresh failed - clear auth state and redirect to login
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// API error type
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

// Extract error from Axios error
export function getApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { code?: string; message?: string };
    return {
      code: data.code || 'UNKNOWN_ERROR',
      message: data.message || 'An unexpected error occurred',
      statusCode: error.response.status,
    };
  }

  return {
    code: 'NETWORK_ERROR',
    message: error instanceof Error ? error.message : 'Network error',
    statusCode: 0,
  };
}
