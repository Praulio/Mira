'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Global Error Boundary
 * 
 * Catches and handles errors that occur anywhere in the application.
 * This is a Next.js 15 special file that wraps the entire app in an error boundary.
 * 
 * Following React Best Practices:
 * - Client Component (required for Error Boundaries)
 * - Logs errors to console for debugging
 * - Provides user-friendly error message
 * - Includes reset functionality to attempt recovery
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    // In production, this would be sent to an error tracking service (e.g., Sentry)
    console.error('Global Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-50">
            Something went wrong
          </h2>
          <p className="text-sm text-neutral-400">
            An unexpected error occurred. Don&apos;t worry, your data is safe.
          </p>
          {error.message && (
            <p className="mt-4 rounded-md bg-neutral-800 p-3 text-left text-xs font-mono text-neutral-300">
              {error.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="flex-1 rounded-md bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-neutral-800"
          >
            Go home
          </button>
        </div>

        {/* Error ID for support */}
        {error.digest && (
          <p className="text-xs text-neutral-500">
            Error ID: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
