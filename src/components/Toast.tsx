'use client';

import { useEffect } from 'react';

export function Toast({
  message,
  tone = 'success',
  onDismiss,
}: {
  message: string;
  tone?: 'success' | 'error';
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
        tone === 'success' ? 'bg-slate-900' : 'bg-rose-600'
      }`}
    >
      {message}
    </div>
  );
}
