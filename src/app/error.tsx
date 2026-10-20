'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Internal detail stays in the console/server logs, never in the UI below.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
      <p className="max-w-sm text-sm text-slate-500">
        This page ran into an unexpected error. Try again, or reload the page.
      </p>
      <button
        onClick={() => retry()}
        className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
