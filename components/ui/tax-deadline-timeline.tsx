'use client'

import { cn } from '@/lib/utils'
import {
  buildTaxDeadlineMilestones,
  resolveTaxDeadlineStatuses,
  type TaxDeadlineMilestone,
  type TaxDeadlineStatus,
} from '@/lib/logic/tax-deadlines'

type Props = {
  endYear: number
  className?: string
}

const TRACK_H = 'h-8'

function TimelineDot({ status }: { status: TaxDeadlineStatus }) {
  return (
    <span
      className={cn(
        'block rounded-full border-2 bg-surface-card shrink-0',
        status === 'past' && 'size-2.5 border-border-subtle',
        status === 'next' && 'size-3 border-warning-500 ring-2 ring-warning-100',
        status === 'upcoming' && 'size-2.5 border-border-default',
      )}
      aria-hidden
    />
  )
}

function MilestoneCopy({ milestone, status }: { milestone: TaxDeadlineMilestone; status: TaxDeadlineStatus }) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          'text-xs leading-snug',
          status === 'past' ? 'text-text-muted' : 'text-text-secondary',
        )}
      >
        {milestone.label}
      </p>
      <p
        className={cn(
          'text-sm font-medium mt-0.5 tabular-nums',
          status === 'past' && 'text-text-muted',
          status === 'next' && 'text-text-primary',
          status === 'upcoming' && 'text-text-primary',
        )}
      >
        {milestone.displayDate}
      </p>
    </div>
  )
}

export default function TaxDeadlineTimeline({ endYear, className }: Props) {
  const milestones = buildTaxDeadlineMilestones(endYear)
  const statuses = resolveTaxDeadlineStatuses(milestones)
  const lastIndex = milestones.length - 1

  return (
    <div className={className}>
      {/* Mobile / tablet — vertical timeline */}
      <ol className="flex flex-col lg:hidden">
        {milestones.map((m, i) => {
          const status = statuses.get(m.id) ?? 'upcoming'
          const isLast = i === lastIndex
          return (
            <li key={m.id} className="flex gap-3 relative pb-6 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[11px] top-4 bottom-0 w-px -translate-x-1/2 bg-border-subtle"
                  aria-hidden
                />
              )}
              <div className={cn('relative z-10 flex items-center justify-center', TRACK_H, 'w-6 shrink-0')}>
                <TimelineDot status={status} />
              </div>
              <MilestoneCopy milestone={m} status={status} />
            </li>
          )
        })}
      </ol>

      {/* Desktop — horizontal timeline */}
      <ol className="hidden lg:grid lg:grid-cols-4 lg:gap-x-2">
        {milestones.map((m, i) => {
          const status = statuses.get(m.id) ?? 'upcoming'
          return (
            <li key={m.id} className="flex min-w-0 flex-col items-center text-center">
              <div className={cn('relative flex w-full items-center justify-center', TRACK_H)}>
                {i > 0 && (
                  <span
                    className="absolute right-1/2 left-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle"
                    aria-hidden
                  />
                )}
                {i < lastIndex && (
                  <span
                    className="absolute left-1/2 right-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle"
                    aria-hidden
                  />
                )}
                <div className="relative z-10 flex items-center justify-center">
                  <TimelineDot status={status} />
                </div>
              </div>
              <div className="mt-3 w-full px-1">
                <MilestoneCopy milestone={m} status={status} />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
