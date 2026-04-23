import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const aiCheck = await canUseAI(user.id)
  if (!aiCheck.allowed) return NextResponse.json({ error: aiCheck.reason }, { status: 403 })

  const { userInput, clientId, projectId } = await req.json()

  const [{ data: client }, { data: project }, { data: userData }] = await Promise.all([
    clientId ? supabase.from('clients').select('name').eq('id', clientId).single() : Promise.resolve({ data: null }),
    projectId ? supabase.from('projects').select('title, rate_type, rate_amount').eq('id', projectId).single() : Promise.resolve({ data: null }),
    supabase.from('users').select('business_name').eq('id', user.id).single(),
  ])

  const userPrompt = `Create invoice line items from this description: "${userInput}"

Context:
- Client: ${client?.name ?? 'not specified'}
- Project: ${project?.title ?? 'not specified'}
- Rate: ${project?.rate_type && project?.rate_amount ? `${project.rate_type} £${project.rate_amount}` : 'unknown'}

Return ONLY valid JSON:
{
  "line_items": [
    {
      "description": "professional description",
      "quantity": number,
      "unit_price": number,
      "vat_rate": 20
    }
  ],
  "suggested_payment_terms": "string",
  "notes": "optional notes or null"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('Invoice assist error:', e)
    return NextResponse.json({ error: 'AI assistant failed' }, { status: 500 })
  }
}
