/**
 * Social Planner - 404 Not Found Page
 */

import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Page not found</h2>
        <p className="mt-2 text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-block">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
