'use client'

import { useEffect } from 'react'

export default function DetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DetailError]', error)
  }, [error])

  return (
    <div className="px-6 py-16 flex flex-col items-center text-center gap-3">
      <div className="w-10 h-10 rounded-full inline-flex items-center justify-center bg-danger-50 border border-[color:var(--danger-200)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm font-medium text-text-primary m-0">Failed to load</p>
      <p className="text-sm text-text-secondary m-0">Something went wrong loading this page.</p>
      <button
        onClick={reset}
        className="mt-1 px-4 py-[7px] bg-brand-primary text-white border-none rounded-lg text-sm font-medium cursor-pointer"
      >
        Try again
      </button>
      {error.digest && (
        <p className="text-caption text-text-muted m-0 font-sans">Ref: {error.digest}</p>
      )}
    </div>
  )
}
