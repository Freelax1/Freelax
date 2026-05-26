'use client'

import Link from 'next/link'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'

function syncedLabel(syncedAt: Date | null): string | null {
  if (!syncedAt) return null
  const secs = Math.round((Date.now() - syncedAt.getTime()) / 1000)
  if (secs < 10) return 'Synced just now'
  if (secs < 60) return `Synced ${secs}s ago`
  if (secs < 120) return 'Synced a moment ago'
  return `Synced ${Math.round(secs / 60)}m ago`
}

type Props = {
  syncedAt?: Date | null
}

/** Shared page footer: tax disclaimer + sync / encryption (dashboard, tax, etc.). */
export default function DashboardPageFooter({ syncedAt = null }: Props) {
  const label = syncedLabel(syncedAt)

  return (
    <div className="pt-4 border-t border-border-subtle mt-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
      <NotTaxAdviceDisclaimer variant="footer" className="!mt-0 text-left max-w-md mx-0" />
      <p className="text-caption text-text-secondary text-right shrink-0 whitespace-nowrap">
        {label ? (
          <>
            {label} ·{' '}
          </>
        ) : null}
        <Link href="/security" className="text-text-secondary no-underline font-medium hover:text-text-primary">
          Your data is encrypted
        </Link>
      </p>
    </div>
  )
}
