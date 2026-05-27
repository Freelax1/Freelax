'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Button, { ButtonLink } from '@/components/ui/button'
import { ErrorPageSkeleton } from '@/components/ui'

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
        <div className="mb-5">
          <ErrorPageSkeleton />
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
          <ButtonLink href="/dashboard" intent="secondary" size="md">
            Go to dashboard
          </ButtonLink>
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
