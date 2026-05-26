'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Input, { Select } from '@/components/ui/input'
import Tooltip from '@/components/tooltip'
import { MetricWithTooltip } from '@/components/ui/metric-hint'

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

export type ListMetricItem = {
  label: string
  value: string
  /** Detail on hover / focus */
  tooltip?: string
  highlight?: 'positive' | 'negative' | 'neutral'
}

interface ListMetricsProps {
  items: ListMetricItem[]
  className?: string
}

/** Mercury-style one-line summary above tables */
export function ListMetrics({ items, className }: ListMetricsProps) {
  if (!items.length) return null
  return (
    <div className={cn('flex flex-wrap items-start gap-x-8 gap-y-3 mb-4', className)}>
      {items.map((item, i) => {
        const body = (
          <>
            <div className="flex items-baseline gap-2 text-sm">
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
          </>
        )

        return (
          <div key={i} className="min-w-0">
            {item.tooltip ? (
              <MetricWithTooltip tooltip={item.tooltip}>{body}</MetricWithTooltip>
            ) : (
              body
            )}
          </div>
        )
      })}
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
        <Tooltip label="Clear">
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-base leading-none bg-transparent border-none cursor-pointer p-1 rounded-lg hover:bg-surface-sunken"
          >
            ×
          </button>
        </Tooltip>
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
        'shrink-0 whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium border transition-colors duration-fast',
        active
          ? 'bg-forest-50 text-brand-primary border-brand-primary'
          : 'bg-surface-card text-text-secondary border-border-default hover:bg-surface-sunken',
      )}
    >
      {children}
    </button>
  )
}

interface FilterChipRowProps {
  /** Chip that stays visible while the rest scroll horizontally (e.g. "All") */
  pinned?: ReactNode
  children: ReactNode
  className?: string
}

/** Horizontal chip row — one line, scrolls when there are many filters */
export function FilterChipRow({ pinned, children, className }: FilterChipRowProps) {
  return (
    <div className={cn('flex items-center gap-1.5 mb-3.5 min-w-0', className)}>
      {pinned}
      <div
        className={cn(
          'flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export type CategoryFilterOption = {
  id: string
  label: string
  count?: number
}

/** Show all options as chips when ≤6; otherwise top chips + dropdown for the rest */
const CATEGORY_CHIP_MAX = 6
const CATEGORY_CHIP_VISIBLE = 5

interface CategoryFilterBarProps {
  value: string
  onChange: (id: string) => void
  options: CategoryFilterOption[]
  allId?: string
  allLabel?: string
  moreLabel?: string
  className?: string
}

export function CategoryFilterBar({
  value,
  onChange,
  options,
  allId = 'all',
  allLabel = 'All categories',
  moreLabel = 'More categories',
  className,
}: CategoryFilterBarProps) {
  const useOverflow = options.length > CATEGORY_CHIP_MAX
  const chipOptions = useOverflow ? options.slice(0, CATEGORY_CHIP_VISIBLE) : options
  const menuOptions = useOverflow ? options.slice(CATEGORY_CHIP_VISIBLE) : []
  const menuActive = menuOptions.some(o => o.id === value)

  function optionLabel(o: CategoryFilterOption) {
    return o.count != null ? `${o.label} (${o.count})` : o.label
  }

  return (
    <FilterChipRow
      className={className}
      pinned={
        <FilterChip active={value === allId} onClick={() => onChange(allId)}>
          {allLabel}
        </FilterChip>
      }
    >
      {chipOptions.map(o => (
        <FilterChip
          key={o.id}
          active={value === o.id}
          onClick={() => onChange(value === o.id ? allId : o.id)}
        >
          {optionLabel(o)}
        </FilterChip>
      ))}
      {useOverflow && (
        <div
          className={cn(
            'relative shrink-0 rounded-lg border transition-colors duration-fast',
            menuActive
              ? 'bg-forest-50 border-brand-primary'
              : 'bg-surface-card border-border-default hover:bg-surface-sunken',
          )}
        >
          <Select
            bare
            variant="inline"
            aria-label={moreLabel}
            value={menuActive ? value : ''}
            onChange={e => {
              const next = e.target.value
              onChange(next || allId)
            }}
            className={cn(
              'min-w-[9.5rem] max-w-[11.5rem] py-1 pl-3 pr-8 text-xs font-medium',
              menuActive ? 'text-brand-primary' : 'text-text-secondary',
            )}
            options={[
              { value: '', label: moreLabel },
              ...menuOptions.map(o => ({ value: o.id, label: optionLabel(o) })),
            ]}
          />
        </div>
      )}
    </FilterChipRow>
  )
}
