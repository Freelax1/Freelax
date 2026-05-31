import type { ReactNode } from 'react'
import { Clock } from '@phosphor-icons/react'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'

export interface ActivitySectionProps {
  eventCount: number
  /** Shown under “No activity recorded yet.” */
  emptyHint: string
  children: ReactNode
  title?: string
  icon?: ReactNode
  className?: string
}

/** Activity / audit log on invoice and quote detail pages. */
export function ActivitySection({
  eventCount,
  emptyHint,
  children,
  title = 'Activity',
  icon,
  className,
}: ActivitySectionProps) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-xl border border-border-default overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-sunken px-5 py-3">
        {icon ?? <Clock weight="regular" className="h-4 w-4 shrink-0 text-text-secondary" />}
        <h2 className={cn('text-sm', sectionTitle)}>{title}</h2>
        {eventCount > 0 && (
          <span className="ml-auto text-xs text-text-secondary">
            {eventCount} event{eventCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {eventCount === 0 ? (
        <div className="px-5 py-8 text-center">
          <Clock weight="regular" className="mx-auto mb-2 h-6 w-6 text-text-muted" />
          <p className="text-sm text-text-secondary">No activity recorded yet.</p>
          <p className="mt-1 text-xs text-text-muted">{emptyHint}</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
