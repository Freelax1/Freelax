import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/** Shimmer block — uses global `.fd-skeleton` */
export function SkeletonBone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('fd-skeleton shrink-0', className)} style={style} aria-hidden />
}

/** Matches `StatCard` layout (label → value → optional footer / progress) */
export function StatCardSkeleton({
  size = 'md',
  variant = 'default',
  reserveFooter = false,
  showProgress = false,
  className,
}: {
  size?: 'md' | 'sm'
  variant?: 'default' | 'sunken'
  reserveFooter?: boolean
  showProgress?: boolean
  className?: string
}) {
  const showFooter = reserveFooter || showProgress

  return (
    <div
      className={cn(
        'rounded-xl flex flex-col h-full border border-border-default',
        size === 'md' ? 'p-6 min-h-[152px]' : 'p-4 min-h-[108px]',
        variant === 'sunken' ? 'bg-surface-sunken' : 'bg-surface-card',
        className,
      )}
      aria-hidden
    >
      <SkeletonBone className={cn('mb-3', size === 'md' ? 'h-3 w-[5rem]' : 'h-3 w-[4.5rem]')} />
      <div className="flex-1 flex flex-col justify-center min-h-0 py-1">
        <SkeletonBone className={size === 'md' ? 'h-8 w-[7.5rem]' : 'h-7 w-16'} />
      </div>
      {showFooter && (
        <div
          className={cn(
            'shrink-0 flex flex-col justify-end gap-2 pt-3',
            reserveFooter && 'min-h-[3.75rem]',
          )}
        >
          {showProgress && <SkeletonBone className="h-[5px] w-full rounded-full" />}
          {reserveFooter && <SkeletonBone className="h-3 w-[11rem] max-w-full" />}
        </div>
      )}
    </div>
  )
}

/** Dashboard status line — icon + sentence */
export function StatusLineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)} aria-hidden>
      <SkeletonBone className="w-4 h-4 rounded-full" />
      <SkeletonBone className="h-7 flex-1 max-w-lg rounded-lg" />
    </div>
  )
}

/** “This month” panel */
export function PanelCardSkeleton({ showChart = false, className }: { showChart?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-xl border border-border-default p-6 h-full',
        className,
      )}
      aria-hidden
    >
      <div className="flex justify-between items-center mb-3">
        <SkeletonBone className="h-3 w-24" />
        <SkeletonBone className="h-7 w-[5.5rem] rounded-lg" />
      </div>
      <SkeletonBone className="h-5 w-[88%] max-w-md mb-5" />
      {showChart && <SkeletonBone className="h-[140px] w-full rounded-lg" />}
    </div>
  )
}

/** “What’s coming” timeline rows */
export function WhatsComingSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-xl border border-border-default p-6 h-full',
        className,
      )}
      aria-hidden
    >
      <SkeletonBone className="h-3 w-44 mb-4" />
      <div className="flex flex-col divide-y divide-border-subtle">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <SkeletonBone className="w-1.5 h-1.5 rounded-full" />
            <div className="flex-1 min-w-0 space-y-2">
              <SkeletonBone className="h-3.5 w-[70%]" />
              <SkeletonBone className="h-3 w-20" />
            </div>
            <SkeletonBone className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Matches `ActionList` row — icon, copy, CTA, dismiss */
export function ActionListSkeleton({ rows = 2, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden>
      <SkeletonBone className="h-3 w-36" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 w-full bg-surface-card rounded-xl border border-border-default shadow-card px-5 py-4 min-h-[72px]"
          >
            <SkeletonBone className="w-10 h-10 rounded-lg" />
            <div className="flex-1 min-w-0 space-y-2">
              <SkeletonBone className="h-3.5 w-[85%]" />
              <SkeletonBone className="h-3 w-[55%]" />
            </div>
            <SkeletonBone className="h-8 w-[4.5rem] rounded-lg" />
            <SkeletonBone className="w-4 h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export type TableCellKind = 'checkbox' | 'text' | 'text-wide' | 'amount' | 'badge' | 'action'

export const TABLE_CELL_PRESETS = {
  invoice: ['checkbox', 'text', 'text-wide', 'text', 'text', 'amount', 'badge', 'action'] as TableCellKind[],
  client: ['checkbox', 'text-wide', 'text', 'text-wide', 'amount', 'badge', 'action'] as TableCellKind[],
  quote: ['checkbox', 'text', 'text-wide', 'text', 'text', 'amount', 'badge', 'action'] as TableCellKind[],
  project: ['checkbox', 'text-wide', 'text-wide', 'amount', 'text', 'badge', 'badge', 'action'] as TableCellKind[],
  expense: ['checkbox', 'text', 'text-wide', 'text', 'amount', 'text', 'text', 'action'] as TableCellKind[],
  mileage: ['text', 'text-wide', 'text-wide', 'amount', 'amount', 'action'] as TableCellKind[],
  recurring: ['text-wide', 'text', 'text', 'amount', 'badge', 'action'] as TableCellKind[],
} as const

/** Matches `ListMetrics` — label + value pairs */
export function ListMetricsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start gap-x-8 gap-y-3 mb-4', className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <SkeletonBone className="h-3.5 w-[4.5rem]" />
          <SkeletonBone className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Prose / narrative loading */
export function TextLinesSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-11/12', 'w-3/5']
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBone key={i} className={cn('h-3', widths[i % widths.length])} />
      ))}
    </div>
  )
}

/** Back link + title row used on detail / edit pages */
export function DetailHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      <SkeletonBone className="h-4 w-32" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SkeletonBone className="h-8 w-44 max-w-full" />
          <SkeletonBone className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBone className="h-9 w-24 rounded-lg" />
          <SkeletonBone className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/** Collapsible section on client / project detail */
export function SectionCardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-xl border border-border-default overflow-hidden',
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <SkeletonBone className="h-4 w-36" />
        <SkeletonBone className="w-4 h-4" />
      </div>
      <div className="px-5 py-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBone key={i} className="h-4 w-full max-w-md" />
        ))}
      </div>
    </div>
  )
}

/** Invoice / quote edit form layout */
export function FormPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('max-w-3xl space-y-6', className)} aria-hidden>
      <DetailHeaderSkeleton />
      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-5">
        <SkeletonBone className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn('space-y-2', i === 3 && 'col-span-2')}>
              <SkeletonBone className="h-3 w-20" />
              <SkeletonBone className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <SkeletonBone className="h-4 w-24" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <SkeletonBone className="h-9 flex-1 rounded-lg" />
              <SkeletonBone className="h-9 w-14 rounded-lg" />
              <SkeletonBone className="h-9 w-14 rounded-lg" />
              <SkeletonBone className="w-4 h-4" />
            </div>
          ))}
        </div>
        <SkeletonBone className="h-24 w-full rounded-lg" />
      </div>
    </div>
  )
}

/** Invoice / quote detail — header + summary card + line rows */
export function DocumentDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('max-w-3xl space-y-6', className)} aria-hidden>
      <DetailHeaderSkeleton />
      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBone className="h-3 w-14" />
              <SkeletonBone className="h-4 w-28" />
            </div>
          ))}
        </div>
        <SkeletonBone className="h-px w-full" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <SkeletonBone className="h-4 flex-1 max-w-sm" />
              <SkeletonBone className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <SkeletonBone className="h-5 w-24" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <SkeletonBone className="h-9 w-28 rounded-lg" />
        <SkeletonBone className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  )
}

/** Client detail — header, stat grid, accordion sections */
export function ClientDetailSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <DetailHeaderSkeleton />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fd-stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} size="sm" className="w-full" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <SectionCardSkeleton key={i} rows={i === 0 ? 4 : 3} />
      ))}
    </div>
  )
}

/** Project detail — header, details card, IR35 block */
export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl" aria-hidden>
      <DetailHeaderSkeleton />
      <div className="bg-surface-card rounded-xl border border-border-default p-6 space-y-4">
        <SkeletonBone className="h-4 w-20" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn('space-y-1.5', i === 0 && 'col-span-2')}>
              <SkeletonBone className="h-3 w-16" />
              <SkeletonBone className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
      <SectionCardSkeleton rows={5} />
    </div>
  )
}

/** Notification list rows */
export function NotificationListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('divide-y divide-border-subtle', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
          <div className="flex-1 min-w-0 space-y-2">
            <SkeletonBone className="h-4 w-[75%]" />
            <SkeletonBone className="h-3 w-40" />
          </div>
          <SkeletonBone className="h-5 w-14 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Settings modal — tab rail + form fields */
export function SettingsFormSkeleton() {
  return (
    <div className="flex gap-6 min-h-[320px]" aria-hidden>
      <div className="w-44 shrink-0 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBone key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex-1 space-y-5">
        <SkeletonBone className="h-5 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBone className="h-3 w-24" />
            <SkeletonBone className="h-10 w-full max-w-md rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mileage mobile journey card */
export function MileageMobileCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-xl border border-border-default p-4',
        className,
      )}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <SkeletonBone className="h-4 w-32 flex-1 max-w-[70%]" />
        <SkeletonBone className="h-4 w-14 shrink-0" />
      </div>
      <SkeletonBone className="h-3.5 w-24 mb-2" />
      <SkeletonBone className="h-3 w-full max-w-xs mb-2" />
      <div className="flex items-center justify-between">
        <SkeletonBone className="h-3 w-20" />
        <SkeletonBone className="w-4 h-4" />
      </div>
    </div>
  )
}

/** Table inside rounded card — header row + body skeleton rows */
export function TableCardSkeleton({
  rows = 4,
  cells,
  className,
  tableClassName,
}: {
  rows?: number
  cells: readonly TableCellKind[]
  className?: string
  tableClassName?: string
}) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-xl border border-border-default overflow-hidden',
        className,
      )}
      aria-hidden
    >
      <table className={cn('w-full border-separate border-spacing-0', tableClassName)}>
        <thead>
          <tr>
            {cells.map((_, i) => (
              <th
                key={i}
                className={cn(
                  'px-4 py-2.5 bg-surface-sunken border-b border-border-default',
                  i === 0 && 'rounded-tl-xl',
                  i === cells.length - 1 && 'rounded-tr-xl',
                )}
              >
                <SkeletonBone className="h-3 w-14" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <TableRowsSkeleton rows={rows} cells={cells} />
        </tbody>
      </table>
    </div>
  )
}

/** Full mileage list loading block */
export function MileagePageSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <ListMetricsSkeleton count={3} />
      <SkeletonBone className="h-12 w-full rounded-xl" />
      <TableCardSkeleton rows={4} cells={TABLE_CELL_PRESETS.mileage} className="hidden md:block" />
      <div className="md:hidden space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <MileageMobileCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/** Tax copilot cream banner */
export function TaxBriefingBannerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-default bg-cream-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4',
        className,
      )}
      aria-hidden
    >
      <SkeletonBone className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <SkeletonBone className="h-4 w-full max-w-lg" />
        <SkeletonBone className="h-4 w-[80%] max-w-md" />
      </div>
      <SkeletonBone className="h-9 w-24 rounded-lg shrink-0" />
    </div>
  )
}

function TableCellSkeleton({ kind }: { kind: TableCellKind }) {
  switch (kind) {
    case 'checkbox':
      return (
        <div className="flex justify-center">
          <SkeletonBone className="w-4 h-4 rounded" />
        </div>
      )
    case 'text':
      return <SkeletonBone className="h-3.5 w-20" />
    case 'text-wide':
      return <SkeletonBone className="h-3.5 w-28 max-w-full" />
    case 'amount':
      return <SkeletonBone className="h-3.5 w-16 ml-auto" />
    case 'badge':
      return <SkeletonBone className="h-5 w-14 rounded-full" />
    case 'action':
      return (
        <div className="flex justify-end">
          <SkeletonBone className="w-4 h-4" />
        </div>
      )
    default:
      return <SkeletonBone className="h-3.5 w-20" />
  }
}

export function TableRowsSkeleton({
  rows = 4,
  cells,
  className,
}: {
  rows?: number
  cells: readonly TableCellKind[]
  className?: string
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className={cn('border-t border-border-subtle', className)} aria-hidden>
          {cells.map((kind, colIdx) => (
            <td key={colIdx} className="px-4 py-2.5 first:px-3 first:text-center last:px-3">
              <TableCellSkeleton kind={kind} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export type ListMobileCardVariant = 'invoice' | 'client' | 'expense' | 'project'

/** Matches mobile list cards (checkbox + rows + kebab) */
export function ListMobileCardSkeleton({
  variant = 'invoice',
  className,
}: {
  variant?: ListMobileCardVariant
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-surface-card rounded-xl border border-border-default p-4',
        className,
      )}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SkeletonBone className="w-4 h-4 rounded flex-shrink-0" />
          <SkeletonBone
            className={cn(
              'h-4 flex-1 max-w-full',
              variant === 'project' ? 'w-32' : 'w-24',
            )}
          />
        </div>
        <SkeletonBone className="h-4 w-16 flex-shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-3 mb-2 pl-7">
        <SkeletonBone className="h-3.5 w-28 max-w-[60%]" />
        {variant === 'expense' ? (
          <SkeletonBone className="h-3 w-12 flex-shrink-0" />
        ) : (
          <SkeletonBone className="h-5 w-14 rounded-full flex-shrink-0" />
        )}
      </div>

      {(variant === 'invoice' || variant === 'expense' || variant === 'project') && (
        <div className="flex items-center justify-between gap-3 pl-7">
          <SkeletonBone className="h-3 w-24" />
          <SkeletonBone className="w-4 h-4 flex-shrink-0" />
        </div>
      )}

      {variant === 'client' && (
        <div className="flex justify-end pl-7 mt-1">
          <SkeletonBone className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}

/** “At a glance” — four small stat tiles */
export function QuietRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <SkeletonBone className="h-3 w-24 mb-3" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fd-stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} size="sm" className="w-full" />
        ))}
      </div>
    </div>
  )
}
