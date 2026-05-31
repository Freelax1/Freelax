import type { ReactNode } from 'react'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'

export interface DetailSectionProps {
  title: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  bodyClassName?: string
}

/** Static detail / settings block on entity pages (non-collapsible). */
export function DetailSection({
  title,
  action,
  children,
  className,
  bodyClassName,
}: DetailSectionProps) {
  const hasBody = children != null

  return (
    <div className={cn('bg-surface-card rounded-xl border border-border-default p-6', className)}>
      <div
        className={cn(
          'flex items-center justify-between gap-3',
          hasBody && 'mb-4',
        )}
      >
        <h2 className={cn('text-sm', sectionTitle)}>{title}</h2>
        {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
      </div>
      {hasBody ? <div className={bodyClassName}>{children}</div> : null}
    </div>
  )
}
