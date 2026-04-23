import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
import { calculateTax, getCurrentTaxYear, type StudentLoanPlan } from '@/lib/tax-calculations'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const aiCheck = await canUseAI(user.id)
  if (!aiCheck.allowed) return NextResponse.json({ error: aiCheck.reason }, { status: 403 })

  const { start, end, label } = getCurrentTaxYear()

  const [
    { data: paidInvoices },
    { data: expenses },
    { data: clients },
    { data: profile },
  ] = await Promise.all([
    supabase.from('invoices').select('total, vat_amount, client_id')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gte('paid_date', start.toISOString())
      .lte('paid_date', end.toISOString()),
    supabase.from('expenses').select('amount, category, vat_reclaimable, vat_amount')
      .eq('user_id', user.id)
      .gte('date', start.toISOString().slice(0, 10))
      .lte('date', end.toISOString().slice(0, 10)),
    supabase.from('clients').select('id, name')
      .eq('user_id', user.id),
    supabase.from('users')
      .select('business_type, student_loan_plan, pension_contributions, salary_drawn, dividends_drawn, vat_registered')
      .eq('id', user.id)
      .single(),
  ])

  const totalIncome      = paidInvoices?.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount)), 0) ?? 0
  const totalExpenses    = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const vatCollected     = paidInvoices?.reduce((s, i) => s + Number(i.vat_amount), 0) ?? 0
  type ExpRow = { amount: number; vat_amount: number | null; vat_reclaimable: boolean; category: string }
  const vatReclaimable   = expenses?.filter((e: ExpRow) => e.vat_reclaimable).reduce((s: number, e: ExpRow) => s + Number(e.vat_amount ?? 0), 0) ?? 0
  const netProfit        = totalIncome - totalExpenses

  const businessType = (profile?.business_type ?? 'sole_trader') as 'sole_trader' | 'limited_company' | 'partnership'
  const pension      = Number(profile?.pension_contributions ?? 0)
  const slPlan       = (profile?.student_loan_plan ?? 'none') as StudentLoanPlan
  const vatRegistered = !!profile?.vat_registered

  const taxDetail = calculateTax({
    grossIncome:          totalIncome,
    totalExpenses,
    businessType,
    pensionContributions: pension,
    studentLoanPlan:      slPlan,
    salaryDrawn:          profile?.salary_drawn    ? Number(profile.salary_drawn)    : undefined,
    dividendsDrawn:       profile?.dividends_drawn ? Number(profile.dividends_drawn) : undefined,
  })

  const totalTax     = taxDetail.kind === 'sole_trader' ? taxDetail.totalTax : taxDetail.totalPersonalTax
  const takeHome     = taxDetail.takeHome
  const effectiveRate = taxDetail.effectiveTaxRate
  const paAlert      = taxDetail.kind === 'sole_trader' ? taxDetail.paAlert         : false
  const higherRate   = taxDetail.kind === 'sole_trader' ? taxDetail.higherRateAlert : false
  const poaDue       = Number(taxDetail.paymentsOnAccount ?? 0)

  // Top client
  const clientCounts: Record<string, number> = {}
  paidInvoices?.forEach(i => { if (i.client_id) clientCounts[i.client_id] = (clientCounts[i.client_id] ?? 0) + 1 })
  const topClientId   = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topClient     = clients?.find(c => c.id === topClientId)?.name ?? 'Unknown'
  const clientCount   = new Set(paidInvoices?.map(i => i.client_id)).size

  // Client concentration — share of biggest client's invoices (by count)
  const topClientShare = paidInvoices?.length
    ? Math.round(((clientCounts[topClientId ?? ''] ?? 0) / paidInvoices.length) * 100)
    : 0

  // Top expense category
  const catTotals: Record<string, number> = {}
  expenses?.forEach(e => { catTotals[e.category] = (catTotals[e.category] ?? 0) + Number(e.amount) })
  const topCategoryEntry  = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
  const topCategory       = topCategoryEntry?.[0]?.replace(/_/g, ' ') ?? 'none'
  const topCategoryAmount = topCategoryEntry?.[1] ?? 0

  const endYear      = new Date(end).getFullYear()
  const deadlineYear = endYear + 1
  const vatThreshold = 90000          // 2024–25 UK VAT threshold

  // Build context facts so the model can pick the most relevant suggestions
  const facts = [
    `Business type: ${businessType.replace('_', ' ')}`,
    `Tax year: ${label}`,
    `Total income (ex-VAT): £${totalIncome.toFixed(2)}`,
    `Total expenses: £${totalExpenses.toFixed(2)}`,
    `Net profit: £${netProfit.toFixed(2)}`,
    `Estimated ${businessType === 'limited_company' ? 'personal ' : ''}tax owed: £${totalTax.toFixed(2)}`,
    `Estimated take-home: £${takeHome.toFixed(2)}`,
    `Effective tax rate: ${effectiveRate}%`,
    `Pension contributions this year: £${pension.toFixed(2)}`,
    `Student loan plan: ${slPlan}`,
    `Number of clients: ${clientCount}`,
    `Top client: ${topClient} (${topClientShare}% of invoices)`,
    `Largest expense category: ${topCategory} £${topCategoryAmount.toFixed(2)}`,
    `VAT registered: ${vatRegistered ? 'yes' : 'no'}`,
    vatRegistered ? `VAT collected: £${vatCollected.toFixed(2)} · Reclaimable: £${vatReclaimable.toFixed(2)}` : `VAT threshold: £${vatThreshold.toLocaleString()} (you are at ${Math.round((totalIncome / vatThreshold) * 100)}% of it)`,
    `Personal Allowance taper triggered: ${paAlert ? 'yes (income over £100k)' : 'no'}`,
    `Higher-rate band hit: ${higherRate ? 'yes' : 'no'}`,
    `Payments on Account this cycle: £${poaDue.toFixed(2)}`,
    `Self Assessment deadline: 31 January ${deadlineYear}`,
  ].join('\n')

  // NOTE: Dividend rate label hard-coded inside this prompt. Update every 6 April when the tax year rolls over.
  // See DIV_BASIC_RATE / DIV_HIGHER_RATE in lib/tax-calculations.ts.
  const userPrompt = `You are a UK-tax-aware assistant summarising a freelancer's year. Address them DIRECTLY using "you"/"your". Never use "they", "the freelancer", or any third-person phrasing.

FACTS
${facts}

Write THREE short paragraphs, separated by a blank line. No markdown (no **bold**, no headings). Use "•" bullets only inside paragraph 3.

Paragraph 1 — The year at a glance (2–3 sentences)
Cover: your income, expenses, profit, estimated tax, take-home, and effective rate. Be specific with pounds.

Paragraph 2 — What stands out (2–3 sentences)
Pick the most notable observation(s) from the facts: client concentration, biggest expense category, VAT threshold proximity, £100k taper, higher-rate exposure, Payments on Account, or anything unusual. Explain why it matters in one line.

Paragraph 3 — Suggestions (2–3 concrete, actionable bullets prefixed with "• ")
Pick the MOST relevant to this person's situation. Examples of suggestions (use only those that fit the facts):
• Pension contributions — if pension is £0 or low and you're in higher rate, mention that every £1 contributed reclaims ~40p tax in the higher band (or ~60p effective in the £100–125k taper zone)
• Limited company — if sole trader with profit > £50k, mention incorporation can reduce combined tax via dividends (10.75% basic) + £12,570 salary
• VAT — if within £10k of the £90k threshold and not registered, flag that registration becomes compulsory
• Payments on Account — if tax > £1,000, warn that 31 Jan bill = current liability + 50% POA (which feels like a shock the first year)
• Expense review — if one category dominates, suggest checking for missed deductions (home office use-of-home, phone %, training, subscriptions, software, professional indemnity insurance)
• Client concentration — if top client > 60% of invoices, briefly mention IR35 risk and the benefit of diversifying
• Student loan — if plan is "none" but income is clearly above the plan-1/2/4 thresholds, suggest confirming in Settings

Every suggestion must be specific and actionable — no generic platitudes. Use pound figures where the facts support them.

End the final paragraph with a standalone closing sentence (not a bullet): "Remember to file by 31 January ${deadlineYear}."`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const narrative = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return NextResponse.json({ narrative })
  } catch (e) {
    console.error('SA narrative error:', e)
    return NextResponse.json({ error: 'Failed to generate narrative' }, { status: 500 })
  }
}
