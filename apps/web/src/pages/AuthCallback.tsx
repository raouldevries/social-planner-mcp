/**
 * Social Planner - OAuth Callback Page
 *
 * Handles OAuth callback from Google/Microsoft authentication.
 * Extracts tokens from URL parameters and authenticates the user.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOAuthCallback } from '@/hooks/useAuth';
import { Button, Card, CardBody, Spinner } from '@/components/ui';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const oauthCallbackMutation = useOAuthCallback();
  const [callbackAttempted, setCallbackAttempted] = useState(false);

  const accessToken = searchParams.get('accessToken');
  const refreshToken = searchParams.get('refreshToken');
  const error = searchParams.get('error');

  // Process OAuth callback on mount
  useEffect(() => {
    if (accessToken && refreshToken && !callbackAttempted) {
      setCallbackAttempted(true);
      oauthCallbackMutation.mutate({ accessToken, refreshToken });
    }
  }, [accessToken, refreshToken, callbackAttempted, oauthCallbackMutation]);

  // Error from OAuth provider
  if (error) {
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication failed</h2>
              <p className="text-gray-600 mb-6">{decodeURIComponent(error)}</p>
              <Link to="/login">
                <Button className="w-full">Try again</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // No access token provided
  if (!accessToken) {
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid callback</h2>
              <p className="text-gray-600 mb-6">
                No authentication token was provided. Please try signing in again.
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
  if (oauthCallbackMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          </div>

          <Card>
            <CardBody className="p-8 text-center">
              <Spinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Signing you in</h2>
              <p className="text-gray-600">Please wait while we complete your authentication...</p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Error state from API
  if (oauthCallbackMutation.isError) {
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication failed</h2>
              <p className="text-gray-600 mb-6">
                We couldn&apos;t complete your sign in. Please try again.
              </p>
              <Link to="/login">
                <Button className="w-full">Try again</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Success - this should not be visible as useOAuthCallback redirects
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign in successful!</h2>
            <p className="text-gray-600 mb-6">Redirecting you to the dashboard...</p>
            <Link to="/">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
