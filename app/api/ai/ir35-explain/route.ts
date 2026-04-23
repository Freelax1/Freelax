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

  const { answers, projectId, calculatedStatus } = await req.json()

  // Fetch project + client details
  const { data: project } = await supabase
    .from('projects')
    .select('title, rate_type, rate_amount, clients(name)')
    .eq('id', projectId)
    .single()

  const systemPrompt = `You are a UK IR35 specialist with expertise in HMRC CEST methodology and off-payroll working rules. Provide clear, practical guidance. Always include a disclaimer that this is guidance only, not formal tax advice.`

  const userPrompt = `Analyse this IR35 assessment and provide a plain English explanation.

Project: ${project?.title ?? 'Unknown'}
Client: ${(project as any)?.clients?.name ?? 'Unknown'}
Rate: ${project?.rate_type} £${project?.rate_amount}

Questionnaire answers:
${JSON.stringify(answers, null, 2)}

Calculated status: ${calculatedStatus}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence plain English explanation",
  "risk_factors": ["array of specific risks"],
  "protective_factors": ["array working in their favour"],
  "recommendations": ["practical steps"],
  "disclaimer": "This assessment is based on HMRC CEST questionnaire logic and is a guide only. Consult a qualified accountant or IR35 specialist for formal determination."
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('IR35 AI error:', e)
    return NextResponse.json({ error: 'AI assessment failed' }, { status: 500 })
  }
}
