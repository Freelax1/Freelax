'use client'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { Sparkles, Loader2, X } from 'lucide-react'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'

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
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.06)', padding: '24px 28px 24px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          This month
        </p>
        {!isNewUser && monthlyAvg > 0 && (
          <button
            onClick={() => generateInsight(!!showInsightPanel)}
            disabled={insightLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600,
              color: '#fff',
              background: '#1D6B35',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: insightLoading ? 'default' : 'pointer',
              opacity: insightLoading ? 0.7 : 1,
              transition: 'opacity 150ms',
            }}
          >
            {insightLoading
              ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} />
              : <Sparkles style={{ width: 11, height: 11 }} />
            }
            {insightLoading ? 'Thinking…' : showInsightPanel ? 'Refresh' : 'AI insight'}
          </button>
        )}
      </div>

      {/* AI insight panel */}
      {showInsightPanel && (
        <div style={{
          background: '#F0FDF4', border: '1px solid rgba(29,107,53,0.15)',
          borderRadius: 10, padding: '12px 14px', marginBottom: 14,
          fontSize: 13, color: '#334155', lineHeight: 1.6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles style={{ width: 11, height: 11, color: '#1D6B35' }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#1D6B35', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                AI insight · {monthName}
              </span>
            </div>
            <button
              onClick={dismissInsight}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
              title="Dismiss"
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>
          {insight}
          <div style={{ marginTop: 10 }}>
            <NotTaxAdviceDisclaimer />
          </div>
        </div>
      )}

      {insightError && (
        <p style={{ fontSize: 12, color: '#C0392B', marginBottom: 10 }}>
          Couldn't generate insight — try again.
        </p>
      )}

      {/* Summary sentence */}
      <p style={{ fontSize: 16, fontWeight: 500, color: '#334155', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
        {sentence}
      </p>

      {/* Bar chart */}
      {!isNewUser && (
        <div style={{ marginTop: 20 }}>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={barData} barSize={24} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              {monthlyAvg > 0 && (
                <ReferenceLine y={monthlyAvg} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="3 3" />
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
                    fill={barData[index]?.isCurrent ? '#64748B' : '#CBD5E1'}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={{ fontSize: 11, border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, background: '#fff', boxShadow: 'none' }}
                formatter={(v: number, _: any, props: any) =>
                  props.payload?.isFuture ? ['—', 'Not yet'] : [`£${v.toLocaleString('en-GB')}`, 'Income']
                }
                labelFormatter={(l: string) => l}
              />
              <Bar dataKey="income" radius={[3, 3, 0, 0]} animationDuration={600}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isFuture ? 'rgba(0,0,0,0.04)' : entry.isCurrent ? '#1D6B35' : '#C8E0CF'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {monthlyAvg > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <div style={{ width: 14, borderTop: '1px dashed #CBD5E1' }} />
              <p style={{ fontSize: 11, color: '#94A3B8' }}>Typical month</p>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
