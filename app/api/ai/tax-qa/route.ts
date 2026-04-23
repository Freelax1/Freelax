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

  const { question } = await req.json()
  const { start, end } = getCurrentTaxYear()

  const [{ data: userData }, { data: paidInvoices }, { data: expenses }] = await Promise.all([
    supabase.from('users').select('business_type, vat_registered').eq('id', user.id).single(),
    supabase.from('invoices').select('total').eq('status', 'paid')
      .gte('paid_date', start.toISOString()).lte('paid_date', end.toISOString()),
    supabase.from('expenses').select('amount')
      .gte('date', start.toISOString().slice(0, 10)).lte('date', end.toISOString().slice(0, 10)),
  ])

  const currentIncome = paidInvoices?.reduce((s, i) => s + Number(i.total), 0) ?? 0
  const currentExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
  const netProfit = currentIncome - currentExpenses

  const systemPrompt = `You are a helpful UK tax assistant inside Freedesk, a UK freelancer CRM.

User context:
- Business type: ${userData?.business_type ?? 'sole_trader'}
- VAT registered: ${userData?.vat_registered ?? false}
- Current tax year income: £${currentIncome.toFixed(2)}
- Current expenses: £${currentExpenses.toFixed(2)}
- Net profit: £${netProfit.toFixed(2)}

Answer questions in plain English. Be helpful and specific to their situation.
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
