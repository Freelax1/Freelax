'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/button'
import { ErrorPageSkeleton } from '@/components/ui'

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
    <div className="px-6 py-16 flex flex-col items-center text-center gap-3 max-w-md mx-auto">
      <ErrorPageSkeleton size="sm" className="mb-2" />
      <p className="text-sm font-medium text-text-primary m-0">Failed to load</p>
      <p className="text-sm text-text-secondary m-0">Something went wrong loading this page.</p>
      <Button type="button" intent="primary" size="md" className="mt-1" onClick={reset}>
        Try again
      </Button>
      {error.digest && (
        <p className="text-caption text-text-muted m-0 font-sans">Ref: {error.digest}</p>
      )}
    </div>
  )
}
