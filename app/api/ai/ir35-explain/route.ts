import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { canUseAI } from '@/lib/plan-limits'
import { logAiCall } from '@/lib/api/ai-usage'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
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

  const systemPrompt = `You are a UK IR35 specialist. Give plain English, practical guidance a freelancer can act on immediately. Be direct and concise — no jargon, no hedging.`

  const userPrompt = `Analyse this IR35 assessment for a freelancer.

Project: ${project?.title ?? 'Unknown'}
Client: ${(project as any)?.clients?.name ?? 'Unknown'}
Rate: ${project?.rate_type} £${project?.rate_amount}
Calculated status: ${calculatedStatus}

Questionnaire answers:
${JSON.stringify(answers, null, 2)}

Return ONLY valid JSON with exactly these four fields:
{
  "verdict": "One plain English sentence saying whether this contract looks inside or outside IR35 and the single most important reason why.",
  "risk_level": "Low" | "Medium" | "High",
  "risk_level_explanation": "One sentence explaining what is driving this risk level.",
  "next_steps": ["Up to 3 specific, actionable steps the freelancer should take now — plain English, no bullet padding."]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    await logAiCall(user.id, 'ir35-explain')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('IR35 AI error:', e)
    return NextResponse.json({ error: 'AI assessment failed' }, { status: 500 })
  }
}
