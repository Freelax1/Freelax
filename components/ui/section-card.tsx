import React from 'react'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'

export interface SectionCardProps {
  title: React.ReactNode
  /** Header CTA — use with `variant="flat"` (Mercury-style title row). */
  action?: React.ReactNode
  /** `flat` — white card, title + action in body (dashboard/tax). `sunken` — gray header band (settings). */
  variant?: 'sunken' | 'flat'
  /** Sunken: header background. Flat: optional card surface tint (e.g. `bg-warning-50`). */
  accent?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

export default function SectionCard({
  title,
  action,
  variant = 'sunken',
  accent,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  if (variant === 'flat') {
    return (
      <div
        className={cn(
          'bg-surface-card rounded-xl border border-border-default',
          accent,
          className,
        )}
      >
        <div className="p-6">
          <div
            className={cn(
              'flex items-start justify-between gap-3',
              (action || children) && 'mb-3',
            )}
          >
            <h2 className={sectionTitle}>{title}</h2>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          <div className={bodyClassName}>{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-surface-card rounded-xl border border-border-default overflow-hidden', className)}>
      <div className={cn('px-5 py-3 border-b border-border-subtle', accent ?? 'bg-surface-sunken')}>
        <h2 className={sectionTitle}>{title}</h2>
      </div>
      <div className={cn('px-5 py-1', bodyClassName)}>{children}</div>
    </div>
  )
}
