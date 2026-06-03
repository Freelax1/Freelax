import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
import { logAiCall } from '@/lib/api/ai-usage'
import { getCurrentTaxYear } from '@/lib/tax-calculations'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const aiCheck = await canUseAI(user.id)
  if (!aiCheck.allowed) return NextResponse.json({ error: aiCheck.reason }, { status: 403 })

  const { thisMonthIncome, monthlyAvg, expensesThisMonth, monthName } = await req.json()

  const { start, end } = getCurrentTaxYear()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  // Look back 3 full months for trend context.
  const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10)
  const lastMonthStart      = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const lastMonthEnd        = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

  // Fetch this month's paid invoices to find top client + this month's expenses + trailing 3 months income
  const [
    { data: monthInvoices },
    { data: monthExpenses },
    { data: trailingInvoices },
    { data: lastMonthInvoices },
    { data: lastMonthExpenses },
  ] = await Promise.all([
    supabase.from('invoices')
      .select('total, vat_amount, clients(name)')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('paid_date', monthStart)
      .lte('paid_date', end.toISOString()),
    supabase.from('expenses')
      .select('amount, category')
      .eq('user_id', user.id)
      .gte('date', monthStart),
    supabase.from('invoices')
      .select('total, vat_amount, paid_date')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('paid_date', threeMonthsAgoStart),
    supabase.from('invoices')
      .select('total, vat_amount')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('paid_date', lastMonthStart)
      .lte('paid_date', lastMonthEnd),
    supabase.from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd),
  ])

  // Bucket trailing income by calendar month so the model can describe the trend specifically.
  const monthBuckets: Record<string, number> = {}
  trailingInvoices?.forEach(inv => {
    if (!inv.paid_date) return
    const d = new Date(inv.paid_date as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthBuckets[key] = (monthBuckets[key] ?? 0) + (Number(inv.total) - Number(inv.vat_amount ?? 0))
  })
  const trailing3 = Object.entries(monthBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-4)
    .map(([key, total]) => {
      const [y, m] = key.split('-').map(Number)
      const name = new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short' })
      return `${name} £${Math.round(total).toLocaleString('en-GB')}`
    })

  const lastMonthIncome   = lastMonthInvoices?.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0) ?? 0
  const lastMonthExpTotal = lastMonthExpenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const lastMonthProfit   = lastMonthIncome - lastMonthExpTotal
  const thisMonthProfit   = thisMonthIncome - expensesThisMonth

  const topClient = (() => {
    if (!monthInvoices?.length) return null
    const counts: Record<string, { name: string; total: number }> = {}
    monthInvoices.forEach((inv: any) => {
      const name = inv.clients?.name
      if (!name) return
      if (!counts[name]) counts[name] = { name, total: 0 }
      counts[name].total += Number(inv.total) - Number(inv.vat_amount ?? 0)
    })
    return Object.values(counts).sort((a, b) => b.total - a.total)[0]?.name ?? null
  })()

  const topCategory = (() => {
    if (!monthExpenses?.length) return null
    const cats: Record<string, number> = {}
    monthExpenses.forEach((e: any) => { cats[e.category] = (cats[e.category] ?? 0) + Number(e.amount) })
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0].replace(/_/g, ' ') : null
  })()

  const diff    = thisMonthIncome - monthlyAvg
  const pct     = monthlyAvg > 0 ? Math.round((Math.abs(diff) / monthlyAvg) * 100) : 0
  const trend   = diff > 0 ? `${pct}% above` : diff < 0 ? `${pct}% below` : 'right on'

  const prompt = `You are a friendly financial assistant inside Freelax, a UK freelancer finance app.

Write a single short paragraph (2-3 sentences max) summarising this freelancer's ${monthName}.
Be conversational, warm, and specific. Reference the trend (not just this month in isolation). Use plain English — no jargon.
If things look good, be encouraging. If it's a quiet month, be reassuring. Never use bullet points or headers. Never mention "Freelax". Never say "I don't have data" — every figure you need is below.

THIS MONTH (${monthName})
- Income so far: £${thisMonthIncome.toLocaleString('en-GB')}
- Expenses: £${expensesThisMonth.toLocaleString('en-GB')}
- Profit: £${thisMonthProfit.toLocaleString('en-GB')}
- Top client: ${topClient ?? 'none yet'}
- Top expense category: ${topCategory ?? 'none logged'}

COMPARISON
- Tax-year monthly average income: £${monthlyAvg.toLocaleString('en-GB')} (this month is ${trend} average)
- Last month income: £${Math.round(lastMonthIncome).toLocaleString('en-GB')}, expenses £${Math.round(lastMonthExpTotal).toLocaleString('en-GB')}, profit £${Math.round(lastMonthProfit).toLocaleString('en-GB')}

TRAILING 4-MONTH INCOME TREND
${trailing3.length ? trailing3.join(' → ') : 'no income recorded in the past 4 months'}

Write the paragraph now:`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const insight = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    await logAiCall(user.id, 'monthly-insight')
    return NextResponse.json({ insight })
  } catch (e) {
    console.error('Monthly insight error:', e)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
