/**
 * Social Planner - Verify Email Page
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useVerifyEmail } from '@/hooks/useAuth';
import { Button, Card, CardBody, Spinner } from '@/components/ui';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmailMutation = useVerifyEmail();
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  // Auto-verify on mount if token is present
  useEffect(() => {
    if (token && !verificationAttempted) {
      setVerificationAttempted(true);
      verifyEmailMutation.mutate(token);
    }
  }, [token, verificationAttempted, verifyEmailMutation]);

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          </div>

          <Card>
            <CardBody className="p-8 text-center">
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Invalid verification link
              </h2>
              <p className="text-gray-600 mb-6">
                This email verification link is invalid or has expired.
              </p>
              <Link to="/login">
                <Button className="w-full">Go to sign in</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (verifyEmailMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          </div>

          <Card>
            <CardBody className="p-8 text-center">
              <Spinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Verifying your email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (verifyEmailMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          </div>

          <Card>
            <CardBody className="p-8 text-center">
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-600 mb-6">
                We couldn&apos;t verify your email. The link may have expired or already been used.
              </p>
              <Link to="/login">
                <Button className="w-full">Go to sign in</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
        </div>

        <Card>
          <CardBody className="p-8 text-center">
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Email verified!</h2>
            <p className="text-gray-600 mb-6">
              Your email has been verified successfully. You can now sign in to your account.
            </p>
            <Link to="/login">
              <Button className="w-full">Sign in</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
