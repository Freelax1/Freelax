'use client'
import Link from 'next/link'
import { formatCurrency } from '@/lib/tax-calculations'
import { TrendingUp, TrendingDown } from 'lucide-react'
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

export default function CashflowRow({
  netProfit, taxYearLabel, yoyIncomeChange, monthlyAvg,
  taxTotal, taxPotSaved, taxDeadline, runway,
}: Props) {
  const taxPct  = taxTotal > 0 ? Math.min(100, Math.round((taxPotSaved / taxTotal) * 100)) : 0
  const onTrack = taxPct >= 100

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* You keep */}
      <div className="bg-[#0A0A0A] rounded-2xl p-6 text-white">
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.12em] mb-2">You keep</p>
        <p className="text-4xl font-extrabold tracking-tight leading-none">{formatCurrency(netProfit)}</p>
        <p className="text-xs text-white/35 mt-2">After expenses · Tax year {taxYearLabel}</p>
        {yoyIncomeChange !== 0 && (
          <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: yoyIncomeChange > 0 ? '#4ADE80' : '#F87171' }}>
            {yoyIncomeChange > 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {Math.abs(yoyIncomeChange)}% vs last year
          </div>
        )}
        <p className="text-[10px] text-white/25 mt-2">Avg {formatCurrency(monthlyAvg)}/month</p>
      </div>

      {/* Tax pot */}
      <Link href="/tax" className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-colors block">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-2">Tax pot</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-extrabold tracking-tight leading-none text-slate-900">{formatCurrency(taxPotSaved)}</p>
          <p className="text-sm text-slate-400">/ {formatCurrency(taxTotal)}</p>
        </div>
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${taxPct}%`, background: onTrack ? '#1D6B35' : taxPct > 50 ? '#9A7B0A' : '#C0392B' }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {onTrack
            ? 'On track'
            : `${formatCurrency(Math.max(0, taxTotal - taxPotSaved))} still to save`} · due {taxDeadline.label}
        </p>
      </Link>

      {/* Runway */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-center">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-4">Runway</p>
        <RunwayCard months={runway.months} label={runway.label} />
      </div>

    </div>
  )
}
