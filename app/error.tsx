'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Button, { ButtonLink } from '@/components/ui/button'
import { ErrorPageSkeleton } from '@/components/ui'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-paper font-sans">
      <div className="max-w-[440px] w-full text-center">
        <div className="mb-6">
          <ErrorPageSkeleton />
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
          <ButtonLink href="/" intent="secondary" size="md">
            Go home
          </ButtonLink>
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
