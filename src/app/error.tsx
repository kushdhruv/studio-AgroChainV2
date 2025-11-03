'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
        <p className="mb-4 text-gray-600">{error.message}</p>
        {error.digest && (
          <p className="mb-4 text-sm text-gray-500">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}