'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { Sparkle, CircleNotch, X } from '@phosphor-icons/react'
import Button from '@/components/ui/button'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'
import { cardLabel } from '@/lib/typography'
import { cn } from '@/lib/utils'

interface MonthData { month: string; income: number }

interface Props {
  thisMonthIncome:    number
  monthlyAvg:         number
  chartData:          MonthData[]
  expensesThisMonth?: number
  isNewUser?:         boolean
}

const MONTHS_FULL = ['April','May','June','July','August','September','October','November','December','January','February','March']
const MONTHS      = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']

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

  const barData: { month: string; income: number; isCurrent: boolean; isFuture: boolean }[] = []
  if (!isNewUser) {
    const dataMap   = Object.fromEntries(chartData.map(d => [d.month, d.income]))
    const lastMonth = chartData.length > 0 ? chartData[chartData.length - 1].month : MONTHS[0]
    const lastIdx   = MONTHS.indexOf(lastMonth)
    const startIdx  = Math.max(0, lastIdx - 5)
    for (let i = 0; i < 6; i++) {
      const idx       = startIdx + i
      const m         = MONTHS[idx] ?? ''
      const isFuture  = idx > lastIdx
      const isCurrent = idx === lastIdx
      barData.push({ month: m, income: isFuture ? 0 : (dataMap[m] ?? 0), isCurrent, isFuture })
    }
  }

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
      {!isNewUser && (
        <div className="mt-5">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={barData} barSize={24} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              {monthlyAvg > 0 && (
                <ReferenceLine y={monthlyAvg} stroke="var(--border-default)" strokeWidth={1} strokeDasharray="3 3" />
              )}
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload, index }: any) => (
                  <text
                    x={x} y={y + 12}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={barData[index]?.isCurrent ? 600 : 400}
                    fill={barData[index]?.isCurrent ? 'var(--text-secondary)' : 'var(--border-default)'}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={{ fontSize: 'var(--text-caption)', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--surface-card)', boxShadow: 'none' }}
                formatter={(v: number, _: any, props: any) =>
                  props.payload?.isFuture ? ['—', 'Not yet'] : [`£${v.toLocaleString('en-GB')}`, 'Income']
                }
                labelFormatter={(l: string) => l}
              />
              <Bar dataKey="income" radius={[3, 3, 0, 0]} animationDuration={600}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isFuture ? 'var(--border-subtle)' : entry.isCurrent ? 'var(--brand-primary)' : 'var(--success-200)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {monthlyAvg > 0 && (
            <div className="flex justify-end items-center gap-1 mt-1">
              <div className="w-3.5 border-t border-dashed border-border-default" />
              <p className={cn(cardLabel, 'text-text-secondary')}>Typical month</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
