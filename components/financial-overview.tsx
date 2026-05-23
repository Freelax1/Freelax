'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { createClient } from '@/lib/supabase/client'

const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']

interface Props {
  userId: string
  taxYearStart: string
  taxYearEnd: string
}

export default function FinancialOverviewChart({ userId, taxYearStart, taxYearEnd }: Props) {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: invoices }, { data: expenses }] = await Promise.all([
        supabase.from('invoices').select('total, paid_date').eq('status', 'paid')
          .gte('paid_date', taxYearStart).lte('paid_date', taxYearEnd),
        supabase.from('expenses').select('amount, date')
          .gte('date', taxYearStart.slice(0, 10)).lte('date', taxYearEnd.slice(0, 10)),
      ])

      const monthlyData = MONTHS.map((month, i) => {
        // Tax year starts April (month index 3). Map i=0 → April
        const calendarMonth = ((i + 3) % 12) + 1
        const income = invoices?.filter(inv => {
          if (!inv.paid_date) return false
          const m = new Date(inv.paid_date).getMonth() + 1
          return m === calendarMonth
        }).reduce((s, inv) => s + Number(inv.total), 0) ?? 0

        const expense = expenses?.filter(exp => {
          const m = new Date(exp.date).getMonth() + 1
          return m === calendarMonth
        }).reduce((s, exp) => s + Number(exp.amount), 0) ?? 0

        return { month, income, expenses: expense }
      })

      setData(monthlyData)
    }
    load()
  }, [userId, taxYearStart, taxYearEnd])

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={8} barGap={2}>
        <XAxis dataKey="month" tick={{ fontSize: 'var(--text-caption)' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v: number) => `£${v.toLocaleString('en-GB')}`}
          contentStyle={{ fontSize: 'var(--text-xs)', border: '1px solid var(--border-default)', borderRadius: 8 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 'var(--text-xs)' }} />
        <Bar dataKey="income" fill="var(--success-500)" radius={[2,2,0,0]} name="Income" />
        <Bar dataKey="expenses" fill="var(--danger-500)" radius={[2,2,0,0]} name="Expenses" />
      </BarChart>
    </ResponsiveContainer>
  )
}
