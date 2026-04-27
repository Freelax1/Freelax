import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
import { calculateTax, getCurrentTaxYear } from '@/lib/tax-calculations'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const aiCheck = await canUseAI(user.id)
  if (!aiCheck.allowed) return NextResponse.json({ error: aiCheck.reason }, { status: 403 })

  const { question } = await req.json()
  const { start, end } = getCurrentTaxYear()

  const [{ data: userData }, { data: paidInvoices }, { data: expenses }] = await Promise.all([
    supabase.from('users').select('business_type, vat_registered, other_income, investment_dividends, pension_contributions, student_loan_plan, salary_drawn, dividends_drawn').eq('id', user.id).single(),
    supabase.from('invoices').select('total, vat_amount').eq('status', 'paid')
      .gte('paid_date', start.toISOString()).lte('paid_date', end.toISOString()),
    supabase.from('expenses').select('amount')
      .gte('date', start.toISOString().slice(0, 10)).lte('date', end.toISOString().slice(0, 10)),
  ])

  const currentIncome = paidInvoices?.reduce((s, i) => s + (Number(i.total) - Number(i.vat_amount ?? 0)), 0) ?? 0
  const currentExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const netProfit = currentIncome - currentExpenses

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

  const systemPrompt = `You are a helpful UK tax assistant inside Freelax, a UK self-employed finance app.

User's current tax position (already calculated correctly — use these figures, do not recalculate):
- Business type: ${userData?.business_type ?? 'sole_trader'}
- VAT registered: ${userData?.vat_registered ?? false}
- Freelance income this tax year (ex-VAT): £${currentIncome.toFixed(2)}
- Allowable expenses: £${currentExpenses.toFixed(2)}
- Net profit from freelance: £${netProfit.toFixed(2)}
- Other income (PAYE, rental, savings interest): £${Number((userData as any)?.other_income ?? 0).toFixed(2)}
- Investment dividends: £${Number((userData as any)?.investment_dividends ?? 0).toFixed(2)}
- Pension contributions: £${Number(userData?.pension_contributions ?? 0).toFixed(2)}
- Student loan plan: ${userData?.student_loan_plan ?? 'none'}

Total tax owed for this year: £${calculatedTaxOwed.toFixed(2)}

When the user asks how much tax they owe, use the figure £${calculatedTaxOwed.toFixed(2)} — do not recalculate from scratch. The figure already factors in all their income sources, allowances, NI, and student loan deductions.

Answer questions in plain English. Be specific to their actual figures.
Always end with: "For formal advice specific to your situation, consult a qualified UK accountant."
Never provide specific tax filing instructions.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ answer })
  } catch (e) {
    console.error('Tax Q&A error:', e)
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 })
  }
}
