'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import MonthlyIncomeChart from '@/components/ui/monthly-income-chart'
import { buildMonthlyIncomeBars } from '@/lib/logic/dashboard'
import { Sparkle, CircleNotch, X } from '@phosphor-icons/react'
import Button from '@/components/ui/button'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'
import { cardLabel } from '@/lib/typography'

interface MonthData { month: string; income: number }

interface Props {
  thisMonthIncome:    number
  monthlyAvg:         number
  chartData:          MonthData[]
  expensesThisMonth?: number
  isNewUser?:         boolean
}

const MONTHS_FULL = ['April','May','June','July','August','September','October','November','December','January','February','March']

export default function ThisMonth({ thisMonthIncome, monthlyAvg, chartData, expensesThisMonth = 0, isNewUser }: Props) {
  const diff = thisMonthIncome - monthlyAvg
  const pct  = monthlyAvg > 0 ? Math.round((diff / monthlyAvg) * 100) : 0

  const [insight, setInsight]           = useState<string | null>(null)
  const [insightVisible, setInsightVisible] = useState(true)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError]     = useState(false)

  const now       = new Date()
  const monthName = MONTHS_FULL[((now.getMonth() - 3) + 12) % 12]
  const cacheKey  = `fd_insight_${now.getFullYear()}_${now.getMonth()}_${Math.round(thisMonthIncome)}_${Math.round(monthlyAvg)}_${Math.round(expensesThisMonth)}`

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(cacheKey + '_dismissed')
      if (dismissed === '1') { setInsightVisible(false); return }
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) { setInsight(cached); setInsightVisible(true) }
    } catch {}
  }, [cacheKey])

  async function generateInsight(force = false) {
    setInsightError(false)
    setInsightVisible(true)
    try { sessionStorage.removeItem(cacheKey + '_dismissed') } catch {}
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) { setInsight(cached); return }
      } catch {}
    }
    setInsightLoading(true)
    try {
      const res  = await fetch('/api/ai/monthly-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thisMonthIncome, monthlyAvg, expensesThisMonth, monthName }),
      })
      const data = await res.json()
      if (data.insight) {
        setInsight(data.insight)
        try { sessionStorage.setItem(cacheKey, data.insight) } catch {}
      } else {
        setInsightError(true)
      }
    } catch {
      setInsightError(true)
    }
    setInsightLoading(false)
  }

  function dismissInsight() {
    setInsightVisible(false)
    try { sessionStorage.setItem(cacheKey + '_dismissed', '1') } catch {}
  }

  let sentence: string
  if (isNewUser || monthlyAvg === 0) {
    sentence = "This will show how your month compares to your average once you have paid invoices."
  } else if (thisMonthIncome === 0) {
    sentence = `Nothing paid in yet this month. Your typical month is ${formatCurrency(monthlyAvg)}.`
  } else if (Math.abs(pct) < 5) {
    sentence = `Right on your typical month — ${formatCurrency(thisMonthIncome)} in so far.`
  } else if (diff > 0) {
    sentence = `You're ${formatCurrency(diff)} ahead of your typical month.`
  } else {
    sentence = `This month is ${formatCurrency(Math.abs(diff))} lighter than your typical month.`
  }

  const barData = !isNewUser ? buildMonthlyIncomeBars(chartData) : []

  const showInsightPanel = insight && insightVisible

  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-6 h-full">
      {/* Header row */}
      <div className="flex justify-between items-center mb-3">
        <p className={cardLabel}>
          This month
        </p>
        {!isNewUser && monthlyAvg > 0 && (
          <Button
            intent="secondary"
            size="xs"
            onClick={() => generateInsight(!!showInsightPanel)}
            disabled={insightLoading}
          >
            {insightLoading
              ? <CircleNotch weight="regular" className="w-[11px] h-[11px] animate-spin" />
              : <Sparkle weight="regular" className="w-[11px] h-[11px]" />
            }
            {insightLoading ? 'Thinking…' : showInsightPanel ? 'Refresh' : 'AI insight'}
          </Button>
        )}
      </div>

      {/* AI insight panel */}
      {showInsightPanel && (
        <div className="bg-success-50 border border-success-200 rounded-xl px-3.5 py-3 mb-3.5 text-sm text-text-primary leading-relaxed">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkle weight="regular" className="w-[11px] h-[11px] text-brand-primary" />
              <span className="text-micro font-semibold text-brand-primary">
                AI insight · {monthName}
              </span>
            </div>
            <button
              onClick={dismissInsight}
              className="bg-transparent border-none cursor-pointer p-px text-text-secondary flex items-center"
              title="Dismiss"
            >
              <X weight="regular" className="w-[13px] h-[13px]" />
            </button>
          </div>
          {insight}
          <div className="mt-2.5">
            <NotTaxAdviceDisclaimer />
          </div>
        </div>
      )}

      {insightError && (
        <p className="text-xs text-danger-500 mb-2.5">
          Couldn't generate insight — try again.
        </p>
      )}

      {/* Summary sentence */}
      <p className="text-base font-medium text-text-primary tracking-tight leading-normal">
        {sentence}
      </p>

      {/* Bar chart */}
      {!isNewUser && barData.length > 0 && (
        <div className="mt-5">
          <MonthlyIncomeChart data={barData} typicalMonth={monthlyAvg} />
        </div>
      )}
    </div>
  )
}
