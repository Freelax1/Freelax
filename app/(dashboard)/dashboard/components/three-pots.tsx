'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'
import { useFloatingPosition } from '@/lib/use-floating-position'
import { cardLabel } from '@/lib/typography'
import StatCard from '@/components/ui/stat-card'
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

const POPOVER_WIDTH = 264
const POPOVER_ESTIMATE_HEIGHT = 280

function SafeToSpendInfo() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { coords, side } = useFloatingPosition(open, triggerRef, panelRef, {
    preferredSide: 'top',
    align: 'end',
    gap: 10,
    estimateWidth: POPOVER_WIDTH,
    estimateHeight: POPOVER_ESTIMATE_HEIGHT,
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const panel = open && mounted ? (
    <div
      ref={panelRef}
      role="tooltip"
      className={cn(
        'fixed w-[264px] bg-surface-card border border-border-default rounded-[var(--radius-lg)] px-4 py-4 z-dropdown shadow-popover',
        side === 'top' ? 'origin-bottom right' : 'origin-top right',
      )}
      style={{ top: coords.top, left: coords.left }}
      onMouseEnter={() => setOpen(true)}
    >
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
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="How safe to spend is calculated"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        className={cn(
          'w-[18px] h-[18px] rounded-full font-semibold cursor-pointer flex items-center justify-center shrink-0 leading-none p-0 transition-all duration-[150ms] border-[1.5px]',
          open
            ? 'border-border-focus bg-forest-50 text-brand-primary'
            : 'border-border-default bg-transparent text-text-secondary'
        )}
      >
        i
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
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
