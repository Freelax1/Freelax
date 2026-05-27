'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/button'
import { ErrorPageSkeleton } from '@/components/ui'

export default function InvoiceViewerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[InvoiceViewerError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-surface-paper font-sans">
      <div className="max-w-[380px] w-full text-center">
        <div className="mb-5">
          <ErrorPageSkeleton size="sm" />
        </div>
        <h2 className="text-base font-semibold text-text-primary mb-1.5">
          Unable to load invoice
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          This invoice could not be loaded. The link may be invalid or expired.
        </p>
        <Button type="button" intent="primary" size="md" onClick={reset}>
          Try again
        </Button>
        {error.digest && (
          <p className="text-xs text-text-muted mt-4 font-sans">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
