/**
 * Social Planner - Reset Password Page
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '@/hooks/useAuth';
import { useIsAuthenticated } from '@/stores/authStore';
import { Button, Input, FormField, Card, CardBody, Spinner } from '@/components/ui';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const isAuthenticated = useIsAuthenticated();
  const resetPasswordMutation = useResetPassword();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          </div>

          <Card>
            <CardBody className="p-6 sm:p-8 text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid reset link</h2>
              <p className="text-gray-600 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password">
                <Button className="w-full">Request new link</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate({
      token,
      password: data.password,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          <p className="mt-2 text-gray-600">Set your new password</p>
        </div>

        <Card>
          <CardBody className="p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                label="New Password"
                htmlFor="password"
                error={errors.password?.message}
                hint="Must be at least 8 characters"
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  error={!!errors.password}
                  {...register('password')}
                />
              </FormField>

              <FormField
                label="Confirm New Password"
                htmlFor="confirmPassword"
                error={errors.confirmPassword?.message}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
              </FormField>

              <Button type="submit" disabled={resetPasswordMutation.isPending} className="w-full">
                {resetPasswordMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" />
                    Resetting...
                  </span>
                ) : (
                  'Reset password'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Back to sign in
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
