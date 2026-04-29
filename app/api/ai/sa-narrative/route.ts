import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
import { logAiCall } from '@/lib/api/ai-usage'
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
      .select('business_type, student_loan_plan, pension_contributions, salary_drawn, dividends_drawn, vat_registered, other_income, investment_dividends')
      .eq('id', user.id)
      .single(),
  ])

  const totalIncome      = paidInvoices?.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount)), 0) ?? 0
  const totalExpenses    = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const vatCollected     = paidInvoices?.reduce((s, i) => s + Number(i.vat_amount), 0) ?? 0
  type ExpRow = { amount: number; vat_amount: number | null; vat_reclaimable: boolean; category: string }
  const vatReclaimable   = expenses?.filter((e: ExpRow) => e.vat_reclaimable).reduce((s: number, e: ExpRow) => s + Number(e.vat_amount ?? 0), 0) ?? 0
  const netProfit        = totalIncome - totalExpenses

  const businessType        = (profile?.business_type ?? 'sole_trader') as 'sole_trader' | 'limited_company' | 'partnership'
  const pension             = Number(profile?.pension_contributions ?? 0)
  const slPlan              = (profile?.student_loan_plan ?? 'none') as StudentLoanPlan
  const vatRegistered       = !!profile?.vat_registered
  const otherIncome         = Number((profile as any)?.other_income ?? 0)
  const investmentDividends = Number((profile as any)?.investment_dividends ?? 0)

  const taxDetail = calculateTax({
    grossIncome:          totalIncome,
    totalExpenses,
    businessType,
    pensionContributions: pension,
    studentLoanPlan:      slPlan,
    salaryDrawn:          profile?.salary_drawn    ? Number(profile.salary_drawn)    : undefined,
    dividendsDrawn:       profile?.dividends_drawn ? Number(profile.dividends_drawn) : undefined,
    otherIncome,
    investmentDividends,
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
    `Other income (employment, rental, savings etc.): £${otherIncome.toFixed(2)}`,
    ...(businessType === 'sole_trader' && investmentDividends > 0 ? [`Investment dividends: £${investmentDividends.toFixed(2)}`] : []),
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

  const invoiceCount = paidInvoices?.length ?? 0
  const expenseCount = expenses?.length ?? 0
  const basedOnLine  = `Based on ${invoiceCount} paid invoice${invoiceCount !== 1 ? 's' : ''} and ${expenseCount} expense${expenseCount !== 1 ? 's' : ''} logged this tax year.`

  const systemPrompt = 'You are a UK tax assistant. Output ONLY the structured summary in the exact format specified — nothing before SNAPSHOT, nothing after the final line. No markdown, no asterisks, no bold, no introductions.'

  const userPrompt = `Produce a structured Self Assessment summary for this UK freelancer. Use "you"/"your" throughout — never third-person.

FACTS
${facts}
Paid invoices this tax year: ${invoiceCount}
Expenses logged this tax year: ${expenseCount}

Output exactly this structure with these exact section headers (copy the headers verbatim):

SNAPSHOT
2–3 sentences. Cover: net profit, estimated tax bill, effective rate, estimated take-home. Specific £ figures. No filler words.

BASED ON
${basedOnLine}

WHAT'S GOING WELL
- [positive observation specific to these numbers, with £ where possible]
- [up to 3 bullets total]

WHERE TO IMPROVE
- [specific improvement area referencing these numbers]
- [up to 3 bullets total]

TAX REDUCTION OPPORTUNITIES
- [specific opportunity with estimated £ saving — pension, mileage, home office, expense categories]
- [up to 3 bullets total — always estimate the £ saving]

KEY DEADLINE
One sentence: file and pay your Self Assessment by 31 January ${deadlineYear}.

Strict rules:
- Maximum 3 bullets per section
- Every bullet must be specific to this user's actual figures — no generic platitudes
- Always estimate the £ saving in Tax Reduction Opportunities where calculable
- Plain text only — no bold, no asterisks, no markdown
- Start directly with SNAPSHOT — no greeting, no preamble
- End with the KEY DEADLINE line — no closing remarks`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const narrative = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    await logAiCall(user.id, 'sa-narrative')
    return NextResponse.json({ narrative })
  } catch (e) {
    console.error('SA narrative error:', e)
    return NextResponse.json({ error: 'Failed to generate narrative' }, { status: 500 })
  }
}
