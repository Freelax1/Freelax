'use client'

import { cn } from '@/lib/utils'
import Input from '@/components/ui/input'

export interface ListStatusTab {
  id: string
  label: string
  count: number
}

interface ListStatusTabsProps {
  tabs: ListStatusTab[]
  value: string
  onChange: (id: string) => void
  /** When set, prepends an "All" tab */
  allCount?: number
  className?: string
}

/** Stripe-style status filter row — neutral pills, brand border when active */
export function ListStatusTabs({ tabs, value, onChange, allCount, className }: ListStatusTabsProps) {
  const items: ListStatusTab[] =
    allCount !== undefined ? [{ id: 'all', label: 'All', count: allCount }, ...tabs] : tabs

  return (
    <div className={cn('flex flex-wrap gap-2 mb-4', className)}>
      {items.map(tab => {
        const isActive = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(isActive && tab.id !== 'all' ? 'all' : tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-left transition-colors duration-fast',
              isActive
                ? 'border-brand-primary bg-forest-50 text-text-primary shadow-xs'
                : 'border-border-default bg-surface-card text-text-secondary hover:border-border-hover hover:bg-surface-sunken',
            )}
          >
            <span className={cn('text-sm font-medium', isActive && 'text-text-primary')}>{tab.label}</span>
            <span
              className={cn(
                'text-xs font-semibold tabular-nums rounded-md px-1.5 py-0.5 min-w-[1.25rem] text-center',
                isActive ? 'bg-brand-primary text-white' : 'bg-surface-sunken text-text-muted',
              )}
            >
              {tab.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface ListMetricsProps {
  items: { label: string; value: string; highlight?: 'positive' | 'negative' | 'neutral' }[]
  className?: string
}

/** Mercury-style one-line summary above tables */
export function ListMetrics({ items, className }: ListMetricsProps) {
  if (!items.length) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-1 mb-4 text-sm', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <span className="text-text-muted">{item.label}</span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              item.highlight === 'positive' && 'text-success-600',
              item.highlight === 'negative' && 'text-danger-600',
              (!item.highlight || item.highlight === 'neutral') && 'text-text-primary',
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface ListSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}

export function ListSearch({ value, onChange, placeholder, className }: ListSearchProps) {
  return (
    <div className={cn('relative flex-1 max-w-md', className)}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx={11} cy={11} r={8} />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
        onKeyDown={e => e.key === 'Escape' && onChange('')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-base leading-none bg-transparent border-none cursor-pointer"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  )
}

interface ListBulkBarProps {
  count: number
  onClear: () => void
  children?: React.ReactNode
  className?: string
}

/** Light bulk-selection bar (Mercury-style, not dark forest) */
export function ListBulkBar({ count, onClear, children, className }: ListBulkBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 mb-3 px-3 py-2.5 rounded-lg border border-border-default bg-surface-sunken',
        className,
      )}
    >
      <span className="text-sm font-medium text-text-primary mr-1">{count} selected</span>
      <div className="w-px h-4 bg-border-default hidden sm:block" />
      {children}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-medium text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer"
      >
        Clear
      </button>
    </div>
  )
}

interface FilterChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

/** Small filter chip for secondary filters (IR35, etc.) */
export function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-lg text-xs font-medium border transition-colors duration-fast',
        active
          ? 'bg-forest-50 text-brand-primary border-brand-primary'
          : 'bg-surface-card text-text-secondary border-border-default hover:bg-surface-sunken',
      )}
    >
      {children}
    </button>
  )
}
