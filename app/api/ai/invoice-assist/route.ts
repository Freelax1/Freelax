import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
import { logAiCall } from '@/lib/api/ai-usage'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const aiCheck = await canUseAI(user.id)
  if (!aiCheck.allowed) return NextResponse.json({ error: aiCheck.reason }, { status: 403 })

  const { userInput, clientId, projectId } = await req.json()

  const [
    { data: client },
    { data: project },
    { data: userData },
    { data: recentInvoices },
    { data: clientInvoices },
  ] = await Promise.all([
    clientId ? supabase.from('clients').select('name, email').eq('id', clientId).single() : Promise.resolve({ data: null }),
    projectId ? supabase.from('projects').select('title, description, rate_type, rate_amount, start_date, end_date').eq('id', projectId).single() : Promise.resolve({ data: null }),
    supabase.from('users').select('business_name, vat_registered, business_type').eq('id', user.id).single(),
    // Last 5 invoices anywhere — gives the model the freelancer's wording style and typical rates.
    supabase.from('invoices').select('total, payment_terms, invoice_line_items(description, quantity, unit_price)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    // Last 3 invoices for THIS client — captures the client's typical rate / description style.
    clientId
      ? supabase.from('invoices').select('total, invoice_line_items(description, quantity, unit_price)')
          .eq('user_id', user.id)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: null }),
  ])

  // Pull typical unit prices from history so the AI can default sensibly when the user is vague.
  const allLineItems = [...(recentInvoices ?? []), ...(clientInvoices ?? [])]
    .flatMap((inv: any) => Array.isArray(inv.invoice_line_items) ? inv.invoice_line_items : [])
  const typicalRates = allLineItems
    .map((li: any) => Number(li?.unit_price))
    .filter((n: number) => Number.isFinite(n) && n > 0)
  const avgRate    = typicalRates.length ? Math.round(typicalRates.reduce((a, b) => a + b, 0) / typicalRates.length) : null
  const recentDescriptions = allLineItems
    .map((li: any) => typeof li?.description === 'string' ? li.description : '')
    .filter(Boolean)
    .slice(0, 8)

  const typicalTerms = recentInvoices?.[0]?.payment_terms ?? 'Net 30'

  const userPrompt = `Create invoice line items from this description: "${userInput}"

FREELANCER
- Business: ${userData?.business_name ?? 'not set'} (${userData?.business_type ?? 'sole_trader'})
- VAT registered: ${userData?.vat_registered ? 'yes — apply 20% VAT' : 'no — set vat_rate to 0'}

THIS INVOICE CONTEXT
- Client: ${client?.name ?? 'not specified'}
- Project: ${project?.title ?? 'not specified'}${project?.description ? ` — ${project.description}` : ''}
- Rate on file: ${project?.rate_type && project?.rate_amount ? `${project.rate_type} £${project.rate_amount}` : 'not set on project'}
- Project dates: ${project?.start_date ?? '?'} → ${project?.end_date ?? '?'}

HISTORY (use this to match the freelancer's style and pricing)
- Recent line-item descriptions: ${recentDescriptions.length ? recentDescriptions.join(' | ') : 'none'}
- Average unit price across recent invoices: ${avgRate ? `£${avgRate}` : 'no history'}
- Typical payment terms: ${typicalTerms}

Use the project rate above when it's set. Fall back to the average rate from history if the user's description is vague. Match the wording style of the recent line-item descriptions. Never reply with "unknown" — pick the best estimate from this context.

Return ONLY valid JSON:
{
  "line_items": [
    {
      "description": "professional description matching this user's style",
      "quantity": number,
      "unit_price": number,
      "vat_rate": ${userData?.vat_registered ? 20 : 0}
    }
  ],
  "suggested_payment_terms": "string (e.g. '${typicalTerms}')",
  "notes": "optional notes or null"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: `You are a professional UK freelance invoicing assistant. Write all prose fields (descriptions, notes, payment terms) in a warm, conversational tone — like a trusted accountant friend. Descriptions should be professional yet natural; notes should read as friendly guidance rather than terse instructions. No bullet points, no bold, no markdown within text fields. Lead with context before detail. Keep it concise.`,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    await logAiCall(user.id, 'invoice-assist')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('Invoice assist error:', e)
    return NextResponse.json({ error: 'AI assistant failed' }, { status: 500 })
  }
}
