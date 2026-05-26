'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Button, { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-[400px] w-full text-center">
        <div className="w-12 h-12 rounded-lg inline-flex items-center justify-center mb-4 bg-danger-50 border border-[color:var(--danger-200)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-text-primary mb-1.5 tracking-tight">
          Something went wrong
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          This page ran into an unexpected error. Try again — if it keeps happening, contact support.
        </p>

        <div className="flex gap-2 justify-center">
          <Button type="button" intent="primary" size="md" onClick={reset}>
            Try again
          </Button>
          <Link href="/dashboard" className={cn(buttonVariants({ intent: 'secondary', size: 'md' }), 'no-underline')}>
            Go to dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="text-caption text-text-muted mt-4 font-sans">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
