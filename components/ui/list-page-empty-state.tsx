'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  ListMetricsSkeleton,
  TableCardSkeleton,
  ListMobileCardSkeleton,
  SkeletonBone,
  TABLE_CELL_PRESETS,
  type TableCellKind,
} from './content-skeletons'

export type ListPageEmptyVariant = 'invoice' | 'client' | 'quote' | 'project' | 'expense'

const TABLE_PRESET: Record<ListPageEmptyVariant, readonly TableCellKind[]> = {
  invoice: TABLE_CELL_PRESETS.invoice,
  client: TABLE_CELL_PRESETS.client,
  quote: TABLE_CELL_PRESETS.quote,
  project: TABLE_CELL_PRESETS.project,
  expense: TABLE_CELL_PRESETS.expense,
}

const MOBILE_VARIANT: Record<ListPageEmptyVariant, 'invoice' | 'client' | 'expense' | 'project'> = {
  invoice: 'invoice',
  client: 'client',
  quote: 'invoice',
  project: 'project',
  expense: 'expense',
}

function ListStatusTabsSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBone key={i} className="h-8 w-[4.5rem] rounded-lg" />
      ))}
    </div>
  )
}

export interface ListPageEmptyStateProps {
  variant: ListPageEmptyVariant
  title: string
  description?: string
  action?: ReactNode
  /** Ghost metrics row (e.g. 2 on invoices, 3 on expenses) — omit when the live page hides metrics at zero rows */
  metricsCount?: number
  /** Optional status-tab strip above metrics */
  showStatusTabs?: boolean
  tableRows?: number
  className?: string
}

/**
 * Full-page empty state for list routes: muted skeleton of the real layout
 * with title, copy, and CTA centered on top. Table “no matches” rows stay separate.
 */
export function ListPageEmptyState({
  variant,
  title,
  description,
  action,
  metricsCount = 0,
  showStatusTabs = false,
  tableRows = 4,
  className,
}: ListPageEmptyStateProps) {
  const cells = TABLE_PRESET[variant]
  const mobileVariant = MOBILE_VARIANT[variant]

  return (
    <div
      className={cn('relative min-h-[min(420px,55vh)]', className)}
      role="region"
      aria-label={title}
    >
      <div
        className="pointer-events-none select-none opacity-[0.42] [&_.fd-skeleton]:!animate-none"
        aria-hidden
      >
        {showStatusTabs && <ListStatusTabsSkeleton />}
        {metricsCount > 0 && <ListMetricsSkeleton count={metricsCount} />}
        <TableCardSkeleton
          rows={tableRows}
          cells={cells}
          className="hidden md:block"
        />
        <div className="md:hidden space-y-2 mt-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListMobileCardSkeleton key={i} variant={mobileVariant} />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="max-w-sm rounded-2xl border border-border-default bg-surface-card/95 px-6 py-8 shadow-sm backdrop-blur-[2px]">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {description && (
            <p className="text-sm text-text-muted mt-2 leading-relaxed">{description}</p>
          )}
          {action && <div className="mt-5">{action}</div>}
        </div>
      </div>
    </div>
  )
}
