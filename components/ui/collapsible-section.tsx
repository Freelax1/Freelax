'use client'

import type { ReactNode } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { sectionTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'

export interface CollapsibleSectionProps {
  title: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Shown in header; clicks do not toggle (e.g. “Add project” link). */
  headerAction?: ReactNode
  children: ReactNode
  className?: string
}

/** Expandable list/table block on detail pages (client projects, quotes, invoices). */
export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  headerAction,
  children,
  className,
}: CollapsibleSectionProps) {
  return (
    <div className={cn('bg-surface-card rounded-xl border border-border-default p-6', className)}>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer items-center justify-between gap-3',
          open && 'mb-4',
        )}
        onClick={() => onOpenChange(!open)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenChange(!open)
          }
        }}
        aria-expanded={open}
      >
        <h2 className={sectionTitle}>{title}</h2>
        <div className="flex items-center gap-4">
          {headerAction ? (
            <div onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
              {headerAction}
            </div>
          ) : null}
          <CaretDown
            weight="regular"
            className={cn(
              'h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200',
              open ? 'rotate-0' : 'rotate-180',
            )}
            aria-hidden
          />
        </div>
      </div>
      {open ? children : null}
    </div>
  )
}
