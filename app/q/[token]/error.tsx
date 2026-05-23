'use client'

import { useEffect } from 'react'

export default function QuoteViewerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[QuoteViewerError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-paper font-sans">
      <div className="max-w-[380px] w-full text-center">
        <div className="w-12 h-12 rounded-full inline-flex items-center justify-center mb-4" style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-200)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-text-primary mb-1.5">
          Unable to load quote
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          This quote could not be loaded. The link may be invalid or expired.
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-brand-primary text-white border-none rounded-lg text-sm font-medium cursor-pointer"
        >
          Try again
        </button>
        {error.digest && (
          <p className="text-xs text-text-muted mt-4 font-sans">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
