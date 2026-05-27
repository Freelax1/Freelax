'use client'

import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'
import { cardLabel } from '@/lib/typography'
import StatCard from '@/components/ui/stat-card'
import { InfoTipTrigger } from '@/components/ui/info-tip-trigger'
import { cn } from '@/lib/utils'

interface Props {
  earnedThisYear:   number
  taxSetAside:      number
  taxTarget:        number
  taxDeadline:      { days: number; label: string }
  safeToSpend:              number | null
  safeToSpendMissingInput:  boolean
  weeklySaveNeeded: number
  isNewUser?:       boolean
}

function SafeToSpendInfo() {
  return (
    <InfoTipTrigger label="How safe to spend is calculated">
      <p className="text-xs font-semibold text-text-primary mb-3">
        How this is calculated
      </p>

      {[
        { label: 'Net income this month',  dotClass: 'bg-success-500', note: 'Your typical monthly net profit (income minus expenses)' },
        { label: 'Tax still to save',      dotClass: 'bg-danger-500',  note: 'Remaining tax liability ÷ months until January deadline' },
        { label: 'Personal outgoings',     dotClass: 'bg-danger-500',  note: 'Rent, food, bills — your cost of living each month' },
      ].map((row, i) => (
        <div key={i} className={cn('flex gap-2.5 items-start', i > 0 && 'pt-2.5 border-t border-border-subtle')}>
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1', row.dotClass)} />
          <div className="flex-1">
            <p className="text-xs font-medium text-text-primary">{row.label}</p>
            <p className="text-caption text-text-secondary mt-px leading-body">{row.note}</p>
          </div>
        </div>
      ))}

      <div className="mt-3 pt-3 flex items-center gap-1.5 border-t border-border-subtle">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
        <p className="text-caption text-text-secondary leading-body">
          = What's genuinely yours to spend this month
        </p>
      </div>
    </InfoTipTrigger>
  )
}

export default function ThreePots({
  earnedThisYear, taxSetAside, taxTarget, taxDeadline,
  safeToSpend, safeToSpendMissingInput, weeklySaveNeeded, isNewUser,
}: Props) {
  const taxPct   = taxTarget > 0 ? Math.min(100, Math.round((taxSetAside / taxTarget) * 100)) : 100
  const onTrack  = taxPct >= 100
  const barColor = onTrack
    ? 'var(--success-500)'
    : taxPct > 60
      ? 'var(--warning-500)'
      : 'var(--danger-500)'

  const showInfo = !isNewUser && !safeToSpendMissingInput && safeToSpend !== null
  const reserveFooter = !isNewUser

  const safeLabel = (
    <div className="flex items-center justify-between gap-2">
      <p className={cardLabel}>Safe to spend</p>
      {showInfo && <SafeToSpendInfo />}
    </div>
  )

  const potCn = 'h-full w-full'

  return (
    <div className="fd-cards-grid">

      <StatCard
        className={potCn}
        variant="sunken"
        label="Earned this year"
        tooltip="Paid income minus expenses this tax year (ex-VAT)."
        value={isNewUser ? '—' : formatCurrency(earnedThisYear)}
        reserveFooter={reserveFooter}
        sub={
          isNewUser
            ? "As you log invoices and they're paid, your total earnings for the year will appear here."
            : 'Income minus expenses · across the tax year'
        }
      />

      <Link href="/tax" className="no-underline flex-1 min-w-0 flex">
        <StatCard
          className={cn(potCn, 'cursor-pointer')}
          label="Tax set aside"
          tooltip="Saved in your Tax pot for January."
          value={isNewUser ? '—' : formatCurrency(taxSetAside)}
          reserveFooter={reserveFooter}
          progressBar={!isNewUser ? { pct: taxPct, color: barColor } : undefined}
          sub={
            isNewUser
              ? "We'll calculate exactly what to save for your January tax bill as you earn. Start by sending an invoice."
              : onTrack
                ? `of ${formatCurrency(taxTarget)} by ${taxDeadline.label} · ✓ On track for January`
                : `of ${formatCurrency(taxTarget)} by ${taxDeadline.label} · Save ${formatCurrency(weeklySaveNeeded)}/week`
          }
          subClassName={!isNewUser && !onTrack ? 'text-warning-700 font-medium' : !isNewUser ? 'text-success-700 font-medium' : undefined}
        />
      </Link>

      {isNewUser ? (
        <StatCard
          className={potCn}
          label={safeLabel}
          value="—"
          sub="Once you've logged some income and told us your typical monthly outgoings, we'll show what's genuinely safe to spend each month."
        />
      ) : safeToSpendMissingInput ? (
        <Link href="/settings?tab=Personal%20tax%20inputs" className="no-underline flex-1 min-w-0 flex">
          <StatCard
            className={cn(potCn, 'cursor-pointer')}
            label={safeLabel}
            value="Set up"
            reserveFooter={reserveFooter}
            sub={
              <>
                Add your monthly outgoings to see what's truly safe to spend.{' '}
                <span className="text-brand-primary font-medium">Set it up →</span>
              </>
            }
          />
        </Link>
      ) : safeToSpend !== null && safeToSpend <= 0 ? (
        <StatCard
          className={potCn}
          label={safeLabel}
          value={formatCurrency(0)}
          valueColor="var(--danger-500)"
          reserveFooter={reserveFooter}
          sub="Spending is tight this month — hold off on big purchases."
        />
      ) : (
        <StatCard
          className={potCn}
          label={safeLabel}
          tooltip="This month after tax and typical outgoings."
          value={formatCurrency(safeToSpend ?? 0)}
          reserveFooter={reserveFooter}
          sub="After tax and your typical monthly outgoings — what's genuinely available to spend this month."
        />
      )}

    </div>
  )
}
