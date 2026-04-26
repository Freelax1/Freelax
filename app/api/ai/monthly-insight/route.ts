import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
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

  // Fetch this month's paid invoices to find top client
  const { data: monthInvoices } = await supabase
    .from('invoices')
    .select('total, vat_amount, clients(name)')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .gte('paid_date', monthStart)
    .lte('paid_date', end.toISOString())

  // Fetch this month's top expense category
  const { data: monthExpenses } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('user_id', user.id)
    .gte('date', monthStart)

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
Be conversational, warm, and specific. Use plain English — no jargon.
If things look good, be encouraging. If it's a quiet month, be reassuring.
Never use bullet points or headers. Never mention "Freelax".

Data for ${monthName}:
- Income so far: £${thisMonthIncome.toLocaleString('en-GB')}
- Monthly average: £${monthlyAvg.toLocaleString('en-GB')} (${trend} average)
- Expenses: £${expensesThisMonth.toLocaleString('en-GB')}
- Top client this month: ${topClient ?? 'none yet'}
- Top expense category: ${topCategory ?? 'none logged'}

Write the paragraph now:`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const insight = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return NextResponse.json({ insight })
  } catch (e) {
    console.error('Monthly insight error:', e)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
