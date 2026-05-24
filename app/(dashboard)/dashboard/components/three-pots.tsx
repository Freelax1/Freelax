'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'
import { serifDisplay } from '@/lib/typography'
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

const LABEL_CN = 'text-caption font-medium text-text-secondary mb-3'
const HERO_CN  = cn('text-[clamp(28px,5vw,40px)] text-text-primary', serifDisplay)
const SUB_CN   = 'text-xs text-text-muted mt-2 leading-relaxed'
const CARD_CN  = 'rounded-xl p-6 border border-border-default flex flex-col gap-0 flex-1'

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[5px] bg-border-subtle rounded-[var(--radius-full)] overflow-hidden mt-3.5">
      <div
        className="h-full rounded-[var(--radius-full)]"
        style={{ background: color, width: `${pct}%` }}
      />
    </div>
  )
}

function SafeToSpendInfo() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        className={cn(
          'w-[18px] h-[18px] rounded-full font-semibold cursor-pointer flex items-center justify-center shrink-0 leading-none p-0 transition-all duration-[150ms] border-[1.5px]',
          open
            ? 'border-border-focus bg-forest-50 text-brand-primary'
            : 'border-border-default bg-transparent text-text-secondary'
        )}
        aria-label="How is Safe to Spend calculated?"
      >
        i
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+10px)] right-0 w-[264px] bg-surface-card border border-border-default rounded-[var(--radius-lg)] px-4 py-4 z-dropdown shadow-popover">

          <p className="text-caption font-semibold text-text-primary mb-3">
            How this is calculated
          </p>

          {[
            { label: 'Net income this month',  value: '+', dotClass: 'bg-success-500', note: 'Your typical monthly net profit (income minus expenses)' },
            { label: 'Tax still to save',      value: '−', dotClass: 'bg-danger-500',  note: 'Remaining tax liability ÷ months until January deadline' },
            { label: 'Personal outgoings',     value: '−', dotClass: 'bg-danger-500',  note: 'Rent, food, bills — your cost of living each month' },
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
      )}
    </div>
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

  return (
    <div className="fd-cards-grid">

      {/* Pot 1 — Earned this year */}
      <div className={`${CARD_CN} bg-surface-sunken`}>
        <p className={LABEL_CN}>Earned this year</p>
        <p className={HERO_CN}>{isNewUser ? '—' : formatCurrency(earnedThisYear)}</p>
        <p className={SUB_CN}>
          {isNewUser
            ? "As you log invoices and they're paid, your total earnings for the year will appear here."
            : 'Income minus expenses · across the tax year'}
        </p>
      </div>

      {/* Pot 2 — Tax set aside */}
      <Link href="/tax" className="no-underline flex-1">
        <div className={`${CARD_CN} bg-surface-card cursor-pointer h-full`}>
          <p className={LABEL_CN}>Tax set aside</p>
          <p className={HERO_CN}>{isNewUser ? '—' : formatCurrency(taxSetAside)}</p>
          {!isNewUser && (
            <>
              <p className="text-sm text-text-secondary mt-1.5">
                of {formatCurrency(taxTarget)} needed by {taxDeadline.label}
              </p>
              <ProgressBar pct={taxPct} color={barColor} />
              <p className={cn('text-caption mt-2 font-medium', onTrack ? 'text-success-700' : 'text-warning-700')}>
                {onTrack ? '✓ On track for January' : `Save ${formatCurrency(weeklySaveNeeded)}/week to stay on track`}
              </p>
            </>
          )}
          {isNewUser && (
            <p className={SUB_CN}>We'll calculate exactly what to save for your January tax bill as you earn. Start by sending an invoice.</p>
          )}
        </div>
      </Link>

      {/* Pot 3 — Safe to spend */}
      <div className={`${CARD_CN} bg-surface-card relative`}>
        <div className="flex items-center justify-between mb-3">
          <p className={`${LABEL_CN} !mb-0`}>Safe to spend</p>
          {showInfo && <SafeToSpendInfo />}
        </div>

        {isNewUser ? (
          <>
            <p className={HERO_CN}>—</p>
            <p className={SUB_CN}>Once you've logged some income and told us your typical monthly outgoings, we'll show what's genuinely safe to spend each month.</p>
          </>
        ) : safeToSpendMissingInput ? (
          <Link href="/settings?tab=Personal%20tax%20inputs" className="no-underline">
            <p className={`${HERO_CN} !text-xl !leading-heading`}>Set up needed</p>
            <p className={`${SUB_CN} !mt-2`}>
              Tell us your monthly personal outgoings (rent, food, bills) and we'll show you what's truly safe to spend.{' '}
              <span className="text-brand-primary font-medium">Set it up →</span>
            </p>
          </Link>
        ) : safeToSpend !== null && safeToSpend <= 0 ? (
          <>
            <p className={`${HERO_CN} !text-danger-500`}>{formatCurrency(0)}</p>
            <p className={SUB_CN}>Spending is tight this month — hold off on big purchases.</p>
          </>
        ) : (
          <>
            <p className={HERO_CN}>{formatCurrency(safeToSpend ?? 0)}</p>
            <p className={SUB_CN}>After tax and your typical monthly outgoings — what's genuinely available to spend this month.</p>
          </>
        )}
      </div>

    </div>
  )
}
