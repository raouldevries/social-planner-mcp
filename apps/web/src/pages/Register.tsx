/**
 * Social Planner - Register Page
 *
 * Registration is disabled (invite-only system).
 * This page shows a message directing users to contact an admin.
 */

import { Link, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '@/stores/authStore';
import { Card, CardBody } from '@/components/ui';

export function Register() {
  const isAuthenticated = useIsAuthenticated();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          <p className="mt-2 text-gray-600">Registration</p>
        </div>

        <Card>
          <CardBody className="p-6 sm:p-8">
            {/* Invite-only message */}
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-2">Invite Only</h2>

              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Registration is by invitation only. If you need access, please contact an
                administrator to receive an invitation link.
              </p>

              <p className="text-gray-500 text-xs mb-6">
                Already have an invitation? Check your email for the invitation link.
              </p>
            </div>

            {/* Login Link */}
            <div className="border-t border-gray-200 pt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
