import React from 'react'
import { cardLabel, serifDisplay, serifStat } from '@/lib/typography'
import { cn } from '@/lib/utils'
import ProgressBar from './progress-bar'

export interface StatCardProgressBar {
  pct: number
  color: string
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  subClassName?: string
  /** Between hero and footer — e.g. “of £X needed by …” */
  middle?: React.ReactNode
  progressBar?: StatCardProgressBar
  /** Match footer height when siblings in a row have progress bars */
  reserveFooter?: boolean
  valueColor?: string
  variant?: 'default' | 'sunken'
  size?: 'md' | 'sm'
  heroClassName?: string
}

export default function StatCard({
  label,
  value,
  sub,
  subClassName,
  middle,
  progressBar,
  reserveFooter = false,
  valueColor,
  variant = 'default',
  size = 'md',
  heroClassName,
  className,
  ...props
}: StatCardProps) {
  const hasFooter = Boolean(progressBar || sub || reserveFooter)

  return (
    <div
      className={cn(
        'rounded-xl flex flex-col h-full border border-border-default',
        size === 'md' ? 'p-6 min-h-[152px]' : 'p-4 min-h-[108px]',
        variant === 'sunken' ? 'bg-surface-sunken' : 'bg-surface-card',
        className,
      )}
      {...props}
    >
      <div className="shrink-0 mb-3">
        {typeof label === 'string' ? (
          <p className={cardLabel}>{label}</p>
        ) : (
          label
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 py-1">
        <p
          className={cn(
            'leading-none tabular-nums w-full',
            size === 'md'
              ? cn('text-[clamp(22px,3.4vw,28px)]', serifDisplay)
              : cn('text-2xl', serifStat),
            heroClassName,
          )}
          style={{ color: valueColor ?? 'var(--text-primary)' }}
        >
          {value}
        </p>
        {middle}
      </div>

      {hasFooter && (
        <div
          className={cn(
            'shrink-0 flex flex-col justify-end gap-2 pt-3',
            reserveFooter && 'min-h-[3.75rem]',
          )}
        >
          {progressBar ? (
            <ProgressBar pct={progressBar.pct} color={progressBar.color} />
          ) : reserveFooter ? (
            <div className="h-[5px] shrink-0" aria-hidden />
          ) : null}
          {sub && (
            <div className={cn('text-xs text-text-secondary leading-relaxed', subClassName)}>
              {sub}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
