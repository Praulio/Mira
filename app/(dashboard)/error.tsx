'use client';

import { useEffect } from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

/**
 * Dashboard Error Boundary
 * 
 * Catches errors that occur within the dashboard route group.
 * Provides a more contextual error UI that fits within the dashboard layout.
 * 
 * Following React Best Practices:
 * - Client Component (required for Error Boundaries)
 * - Logs errors to console for debugging
 * - Provides user-friendly error message with context
 * - Includes reset and navigation options
 * - Minimal re-renders (Best Practice 5.1)
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    // In production, this would be sent to an error tracking service (e.g., Sentry)
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 rounded-lg border border-neutral-800 bg-neutral-900 p-8">
        {/* Error Icon */}
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-red-500/10 p-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-semibold text-neutral-50">
              Failed to load dashboard
            </h2>
            <p className="text-sm text-neutral-400">
              We encountered an error while loading this page. This could be due to a network issue or a temporary problem with our servers.
            </p>
          </div>
        </div>

        {/* Error Details */}
        {error.message && (
          <div className="rounded-md bg-neutral-800 p-4">
            <p className="text-xs font-semibold text-neutral-300 mb-2">Error Details:</p>
            <p className="text-xs font-mono text-neutral-400">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-50 transition-colors hover:bg-neutral-800"
          >
            <Home className="h-4 w-4" />
            Go to dashboard
          </Link>
        </div>

        {/* Support Info */}
        <div className="space-y-2 rounded-md bg-neutral-800/50 p-4">
          <p className="text-xs font-medium text-neutral-300">Need help?</p>
          <p className="text-xs text-neutral-500">
            If this problem persists, please contact your team administrator.
            {error.digest && (
              <>
                <br />
                Reference ID: <code className="font-mono">{error.digest}</code>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
