'use client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import RunwayCard from './runway-card'

interface Props {
  netProfit:       number
  taxYearLabel:    string
  yoyIncomeChange: number
  monthlyAvg:      number
  taxTotal:        number
  taxPotSaved:     number
  taxDeadline:     { days: number; label: string }
  runway:          { months: number | null; label: string }
}

const cardClass =
  'bg-surface-card rounded-xl p-6 border border-border-default transition-[border-color] duration-fast'

export default function CashflowRow({
  netProfit, taxYearLabel, yoyIncomeChange, monthlyAvg,
  taxTotal, taxPotSaved, taxDeadline, runway,
}: Props) {
  const taxPct  = taxTotal > 0 ? Math.min(100, Math.round((taxPotSaved / taxTotal) * 100)) : 0
  const onTrack = taxPct >= 100
  const progressColor = onTrack
    ? 'var(--success-600)'
    : taxPct > 50
      ? 'var(--warning-500)'
      : 'var(--danger-500)'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* You keep */}
      <div className="bg-forest-950 rounded-xl p-6 text-text-on-dark">
        <p className="text-micro font-semibold text-white/40 uppercase mb-2">You keep</p>
        <p className="text-4xl font-extrabold tracking-tight leading-none tabular-nums">{formatCurrency(netProfit)}</p>
        <p className="text-xs text-white/35 mt-2">After expenses · Tax year {taxYearLabel}</p>
        {yoyIncomeChange !== 0 && (
          <div
            className={cn(
              'mt-3 inline-flex items-center gap-1 text-caption font-semibold',
              yoyIncomeChange > 0 ? 'text-success-200' : 'text-danger-200',
            )}
          >
            {yoyIncomeChange > 0
              ? <TrendingUp className="w-3 h-3" aria-hidden />
              : <TrendingDown className="w-3 h-3" aria-hidden />}
            {Math.abs(yoyIncomeChange)}% vs last year
          </div>
        )}
        <p className="text-micro text-white/25 mt-2">Avg {formatCurrency(monthlyAvg)}/month</p>
      </div>

      {/* Tax pot */}
      <Link href="/tax" className={cn(cardClass, 'hover:border-border-hover block')}>
        <p className="text-micro font-semibold text-text-muted uppercase mb-2">Tax pot</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-extrabold tracking-tight leading-none tabular-nums text-text-primary">
            {formatCurrency(taxPotSaved)}
          </p>
          <p className="text-sm text-text-muted">/ {formatCurrency(taxTotal)}</p>
        </div>
        <div className="mt-3 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-progress"
            style={{ width: `${taxPct}%`, background: progressColor }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          {onTrack
            ? 'On track'
            : `${formatCurrency(Math.max(0, taxTotal - taxPotSaved))} still to save`} · due {taxDeadline.label}
        </p>
      </Link>

      {/* Runway */}
      <div className={cn(cardClass, 'flex flex-col justify-center')}>
        <p className="text-micro font-semibold text-text-muted uppercase mb-4">Runway</p>
        <RunwayCard months={runway.months} label={runway.label} />
      </div>

    </div>
  )
}
