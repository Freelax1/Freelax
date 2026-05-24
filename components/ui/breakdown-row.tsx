import React from 'react'
import { cn } from '@/lib/utils'

export interface BreakdownRowProps {
  label: React.ReactNode
  value: string
  bold?: boolean
  red?: boolean
  green?: boolean
  hint?: string
}

/** Label/value row for P&L and tax breakdown sections inside SectionCard. */
export default function BreakdownRow({ label, value, bold, red, green, hint }: BreakdownRowProps) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-border-subtle last:border-0">
      <div>
        <span className={cn('text-sm', bold ? 'font-semibold text-text-primary' : 'text-text-secondary')}>
          {label}
        </span>
        {hint && <p className="text-xs text-text-secondary mt-0.5">{hint}</p>}
      </div>
      <span
        className={cn(
          'text-sm ml-4 shrink-0 tabular-nums',
          bold ? 'font-semibold text-text-primary' : 'font-medium text-text-primary',
          red && 'text-danger-600',
          green && 'text-success-700',
        )}
      >
        {value}
      </span>
    </div>
  )
}
