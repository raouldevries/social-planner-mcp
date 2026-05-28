/**
 * Social Planner - Forgot Password Page
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate } from 'react-router-dom';
import { useForgotPassword } from '@/hooks/useAuth';
import { useIsAuthenticated } from '@/stores/authStore';
import { Button, Input, FormField, Card, CardBody, Spinner, Alert } from '@/components/ui';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const isAuthenticated = useIsAuthenticated();
  const forgotPasswordMutation = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data.email, {
      onSuccess: () => setSubmitted(true),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          <p className="mt-2 text-gray-600">Reset your password</p>
        </div>

        <Card>
          <CardBody className="p-6 sm:p-8">
            {submitted ? (
              // Success state
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
                <p className="text-gray-600 mb-6">
                  If an account exists with that email, you will receive a password reset link
                  shortly.
                </p>
                <Link to="/login">
                  <Button variant="secondary" className="w-full">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              // Form state
              <>
                <Alert variant="info" className="mb-6">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </Alert>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      error={!!errors.email}
                      {...register('email')}
                    />
                  </FormField>

                  <Button
                    type="submit"
                    disabled={forgotPasswordMutation.isPending}
                    className="w-full"
                  >
                    {forgotPasswordMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner size="sm" />
                        Sending...
                      </span>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
