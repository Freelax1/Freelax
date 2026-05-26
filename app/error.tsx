'use client'

import { useEffect } from 'react'
import Button, { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-paper font-sans">
      <div className="max-w-[440px] w-full text-center">
        <div className="w-14 h-14 rounded-lg inline-flex items-center justify-center mb-5 bg-danger-50 border border-[color:var(--danger-200)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          An unexpected error occurred. Try refreshing the page — if it keeps happening, contact support.
        </p>

        <div className="flex gap-2.5 justify-center">
          <Button type="button" intent="primary" size="md" onClick={reset}>
            Try again
          </Button>
          <a href="/" className={cn(buttonVariants({ intent: 'secondary', size: 'md' }), 'no-underline')}>
            Go home
          </a>
        </div>

        {error.digest && (
          <p className="text-caption text-text-muted mt-5 font-sans">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
