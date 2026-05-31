'use client'

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { cardLabel } from '@/lib/typography'
import { cn } from '@/lib/utils'
import type { MonthlyIncomeBar } from '@/lib/logic/dashboard'

const CHART = {
  height: 100,
  barSize: 24,
  barRadius: 3,
  animationMs: 600,
  cursorFill: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
  tooltip: {
    fontSize: 'var(--text-caption)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--surface-card)',
    boxShadow: 'var(--shadow-tooltip)',
  },
  barFill: {
    future: 'var(--border-subtle)',
    current: 'var(--brand-primary)',
    past: 'var(--success-200)',
  },
} as const

function barFill(entry: MonthlyIncomeBar): string {
  if (entry.isFuture) return CHART.barFill.future
  if (entry.isCurrent) return CHART.barFill.current
  return CHART.barFill.past
}

export interface MonthlyIncomeChartProps {
  data: MonthlyIncomeBar[]
  /** Typical monthly income — dashed reference line when above zero */
  typicalMonth?: number
  height?: number
  className?: string
}

export default function MonthlyIncomeChart({
  data,
  typicalMonth = 0,
  height = CHART.height,
  className,
}: MonthlyIncomeChartProps) {
  const showTypical = typicalMonth > 0

  return (
    <div className={cn(className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barSize={CHART.barSize} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          {showTypical && (
            <ReferenceLine
              y={typicalMonth}
              stroke="var(--border-default)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={({ x, y, payload, index }: { x: number; y: number; payload: { value: string }; index: number }) => (
              <text
                x={x}
                y={y + 12}
                textAnchor="middle"
                fontSize="var(--text-micro)"
                fontWeight={data[index]?.isCurrent ? 600 : 400}
                fill={data[index]?.isCurrent ? 'var(--text-secondary)' : 'var(--border-default)'}
              >
                {payload.value}
              </text>
            )}
          />
          <Tooltip
            cursor={{ fill: CHART.cursorFill }}
            contentStyle={CHART.tooltip}
            formatter={(v: number, _: unknown, props: { payload?: MonthlyIncomeBar }) =>
              props.payload?.isFuture
                ? ['—', 'Not yet']
                : [`£${Number(v).toLocaleString('en-GB')}`, 'Income']
            }
            labelFormatter={(l: string) => l}
          />
          <Bar dataKey="income" radius={[CHART.barRadius, CHART.barRadius, 0, 0]} animationDuration={CHART.animationMs}>
            {data.map((entry, i) => (
              <Cell key={i} fill={barFill(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {showTypical && (
        <div className="flex justify-end items-center gap-1 mt-1">
          <div className="w-3.5 border-t border-dashed border-border-default" />
          <p className={cn('text-xs', cardLabel, 'text-text-secondary')}>Typical month</p>
        </div>
      )}
    </div>
  )
}
