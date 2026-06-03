import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
import { logAiCall } from '@/lib/api/ai-usage'
import { calculateTax, getCurrentTaxYear } from '@/lib/tax-calculations'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const aiCheck = await canUseAI(user.id)
  if (!aiCheck.allowed) return NextResponse.json({ error: aiCheck.reason }, { status: 403 })

  const { question } = await req.json()
  const { start, end, label: taxYearLabel } = getCurrentTaxYear()

  const [{ data: userData }, { data: paidInvoices }, { data: expenses }, { data: clients }] = await Promise.all([
    supabase.from('users').select('business_name, business_type, vat_registered, other_income, investment_dividends, pension_contributions, student_loan_plan, salary_drawn, dividends_drawn').eq('id', user.id).single(),
    supabase.from('invoices').select('total, vat_amount, client_id').eq('user_id', user.id).eq('status', 'paid')
      .gte('paid_date', start.toISOString()).lte('paid_date', end.toISOString()),
    supabase.from('expenses').select('amount, category').eq('user_id', user.id)
      .gte('date', start.toISOString().slice(0, 10)).lte('date', end.toISOString().slice(0, 10)),
    supabase.from('clients').select('id, name').eq('user_id', user.id),
  ])

  const currentIncome   = paidInvoices?.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0) ?? 0
  const currentExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const netProfit       = currentIncome - currentExpenses

  // Top expense category — so questions like "what's my biggest cost?" can be answered.
  const catTotals: Record<string, number> = {}
  expenses?.forEach(e => { catTotals[e.category] = (catTotals[e.category] ?? 0) + Number(e.amount) })
  const topCategoryEntry  = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
  const topCategory       = topCategoryEntry?.[0]?.replace(/_/g, ' ') ?? 'none'
  const topCategoryAmount = topCategoryEntry?.[1] ?? 0

  // Top client — for "which client pays me the most?" questions.
  const clientCounts: Record<string, number> = {}
  paidInvoices?.forEach(i => { if (i.client_id) clientCounts[i.client_id] = (clientCounts[i.client_id] ?? 0) + 1 })
  const topClientId = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topClient   = clients?.find(c => c.id === topClientId)?.name ?? 'none'
  const clientCount = new Set(paidInvoices?.map(i => i.client_id).filter(Boolean)).size

  const taxResult = calculateTax({
    grossIncome: currentIncome,
    totalExpenses: currentExpenses,
    businessType: userData?.business_type ?? 'sole_trader',
    pensionContributions: Number(userData?.pension_contributions ?? 0),
    studentLoanPlan: userData?.student_loan_plan ?? 'none',
    salaryDrawn: userData?.salary_drawn ? Number(userData.salary_drawn) : undefined,
    dividendsDrawn: userData?.dividends_drawn ? Number(userData.dividends_drawn) : undefined,
    otherIncome: Number((userData as any)?.other_income ?? 0),
    investmentDividends: Number((userData as any)?.investment_dividends ?? 0),
  })

  const calculatedTaxOwed = taxResult.kind === 'sole_trader' ? taxResult.totalTax : taxResult.totalPersonalTax

  // Payments on Account (POA). HMRC requires POA only when the SA bill exceeds £1,000.
  // taxResult exposes paymentsOnAccount / totalJanuaryPayment / julyPayment but we
  // recompute defensively in case those fields are absent from the typed result.
  const poaBase           = taxResult.kind === 'sole_trader' ? calculatedTaxOwed : (taxResult as any).salaryIncomeTax + (taxResult as any).dividendTax
  const poaApplies        = poaBase > 1000
  const firstPOA          = Number((taxResult as any).paymentsOnAccount ?? (poaApplies ? Math.round(poaBase / 2) : 0))
  const januaryTotal      = Number((taxResult as any).totalJanuaryPayment ?? (calculatedTaxOwed + firstPOA))
  const julyPayment       = Number((taxResult as any).julyPayment ?? firstPOA)

  const endYear      = new Date(end).getFullYear()
  const deadlineYear = endYear + 1

  const systemPrompt = `You are a helpful UK tax assistant inside Freelax, a UK self-employed finance app for the ${taxYearLabel} tax year.

You have FULL ACCESS to this user's tax data below — never tell them "I don't have access to your X" or "I don't have that information". If a question is about UK tax rules in general (not their figures), answer from your tax knowledge.

USER PROFILE
- Business name: ${userData?.business_name ?? 'not set'}
- Business type: ${userData?.business_type ?? 'sole_trader'}
- VAT registered: ${userData?.vat_registered ?? false}
- Student loan plan: ${userData?.student_loan_plan ?? 'none'}

THIS TAX YEAR (${taxYearLabel}) — already calculated correctly, use these figures verbatim, do not recalculate
- Freelance income (ex-VAT): £${currentIncome.toFixed(2)}
- Allowable expenses: £${currentExpenses.toFixed(2)}
- Net profit from freelance: £${netProfit.toFixed(2)}
- Other income (PAYE, rental, savings interest): £${Number((userData as any)?.other_income ?? 0).toFixed(2)}
- Investment dividends: £${Number((userData as any)?.investment_dividends ?? 0).toFixed(2)}
- Pension contributions: £${Number(userData?.pension_contributions ?? 0).toFixed(2)}
- TOTAL TAX OWED for ${taxYearLabel}: £${calculatedTaxOwed.toFixed(2)}

PAYMENTS ON ACCOUNT (POA)
- POA applies: ${poaApplies ? 'YES (tax bill exceeds £1,000)' : 'NO (tax bill is £1,000 or less — no POA required)'}
${poaApplies
  ? `- 31 January ${deadlineYear} payment: £${januaryTotal.toFixed(2)} = balancing payment £${calculatedTaxOwed.toFixed(2)} + 1st POA £${firstPOA.toFixed(2)}
- 31 July ${deadlineYear} payment: £${julyPayment.toFixed(2)} (2nd POA)`
  : `- Single payment due 31 January ${deadlineYear}: £${calculatedTaxOwed.toFixed(2)}`}

KEY DEADLINES
- Self Assessment filing & payment deadline: 31 January ${deadlineYear}
${poaApplies ? `- 2nd Payment on Account: 31 July ${deadlineYear}` : ''}

ACTIVITY SUMMARY
- Paid invoices logged: ${paidInvoices?.length ?? 0}
- Expenses logged: ${expenses?.length ?? 0}
- Clients: ${clientCount}${topClient !== 'none' ? ` (top: ${topClient})` : ''}
- Largest expense category: ${topCategory}${topCategoryAmount > 0 ? ` £${topCategoryAmount.toFixed(2)}` : ''}

RULES
- Answer in plain English with specific £ figures from above.
- Never say "I don't have access to your data" or "I'd need more info" — the data is right above.
- When asked about tax owed, use £${calculatedTaxOwed.toFixed(2)}.
- When asked about January / July payment, use the POA figures above.
- For pure rule questions (e.g. "what is the VAT threshold?"), answer from tax knowledge.
- Never provide step-by-step tax filing instructions.
- Always end with: "For formal advice specific to your situation, consult a qualified UK accountant."`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : ''
    await logAiCall(user.id, 'tax-qa')
    return NextResponse.json({ answer })
  } catch (e) {
    console.error('Tax Q&A error:', e)
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
  }
}
