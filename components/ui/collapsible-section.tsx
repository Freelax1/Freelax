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
  const toggle = () => onOpenChange(!open)
  return (
    <div className={cn('bg-surface-card rounded-xl border border-border-default p-6', className)}>
      <div
        className={cn(
          'flex items-center justify-between gap-3',
          open && 'mb-4',
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex flex-1 items-center gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded-md"
        >
          <h2 className={cn('text-sm', sectionTitle)}>{title}</h2>
        </button>
        <div className="flex items-center gap-2">
          {headerAction ? <div className="inline-flex">{headerAction}</div> : null}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? 'Collapse section' : 'Expand section'}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <CaretDown
              weight="regular"
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                open ? 'rotate-0' : 'rotate-180',
              )}
              aria-hidden
            />
          </button>
        </div>
      </div>
      {open ? children : null}
    </div>
  )
}
