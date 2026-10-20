'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

// Catches a crash in the root layout itself — rare, but if it happens this
// is the only fallback left, so it has to render its own <html>/<body>.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-slate-900">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-slate-500">
          The app ran into an unexpected error. Try again, or reload the page.
        </p>
        <button
          onClick={() => retry()}
          className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
