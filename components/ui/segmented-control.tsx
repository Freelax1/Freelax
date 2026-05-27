'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
}

export type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
  'aria-label'?: string
}

/** Pill toggle group (e.g. monthly / yearly billing). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-2 bg-surface-sunken rounded-xl p-1', className)}
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              active ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-muted',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
