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

  const { answers, projectId, calculatedStatus } = await req.json()

  // Fetch full project + client + user business context so the AI can be specific
  // rather than offering generic IR35 platitudes.
  const [{ data: project }, { data: userData }] = await Promise.all([
    supabase
      .from('projects')
      .select('title, description, rate_type, rate_amount, start_date, end_date, status, ir35_status, ir35_assessed_at, clients(name)')
      .eq('id', projectId)
      .single(),
    supabase
      .from('users')
      .select('business_name, business_type, vat_registered')
      .eq('id', user.id)
      .single(),
  ])

  // Approximate annualised contract value — helps the model gauge whether the
  // freelancer should escalate (e.g. high-value inside-IR35 contracts deserve a stronger nudge).
  const rate = Number(project?.rate_amount ?? 0)
  const annualisedValue = (() => {
    if (!rate || !project?.rate_type) return null
    switch (project.rate_type) {
      case 'day_rate': return rate * 220   // ~220 working days/year
      case 'hourly':   return rate * 1800  // ~1800 chargeable hours/year
      case 'fixed':    return rate
      default:         return null
    }
  })()

  const startDate = project?.start_date ?? 'not set'
  const endDate   = project?.end_date   ?? 'not set'
  const previousStatus = project?.ir35_status && project.ir35_status !== 'needs_review'
    ? `Previously assessed as ${project.ir35_status.replace('_', ' ')} on ${project.ir35_assessed_at ?? 'unknown date'}`
    : 'No prior IR35 assessment on record'

  const systemPrompt = `You are a UK IR35 specialist working inside Freelax. You have full access to the freelancer's project, client, and business details below — never say "I'd need more information" or "without more context". Use the specific contract details to give concrete, actionable guidance.

COMMUNICATION STYLE
- Write in a warm, conversational tone — like a trusted accountant friend explaining things clearly.
- Explain the reasoning and context BEFORE stating the numbers or conclusion.
- Write prose fields (verdict, risk_level_explanation, next_steps) in natural flowing sentences — no bullet padding, no terse fragments.
- Lead with the "why" before the "what".
- Keep each field concise but complete — the verdict should be one clear sentence, next_steps should read as natural advice, not a checklist.
- Do not use any markdown formatting — no asterisks, no italics, no bold, no backticks, no headers.`

  const userPrompt = `Analyse this IR35 assessment.

FREELANCER
- Business: ${userData?.business_name ?? 'Unknown'}
- Trading as: ${userData?.business_type ?? 'sole_trader'}
- VAT registered: ${userData?.vat_registered ? 'yes' : 'no'}

CONTRACT
- Project title: ${project?.title ?? 'Unknown'}
- Description: ${project?.description ?? 'none provided'}
- Client: ${(project as any)?.clients?.name ?? 'Unknown'}
- Rate: ${project?.rate_type ?? 'unknown'} £${rate.toFixed(2)}${annualisedValue ? ` (≈ £${annualisedValue.toLocaleString('en-GB')} annualised)` : ''}
- Start date: ${startDate}
- End date: ${endDate}
- Project status: ${project?.status ?? 'unknown'}
- ${previousStatus}

ASSESSMENT
- Calculated status (from scoring engine): ${calculatedStatus}
- Questionnaire answers: ${JSON.stringify(answers, null, 2)}

Return ONLY valid JSON with exactly these four fields:
{
  "verdict": "One plain English sentence stating inside or outside IR35 and the single most important reason why, referencing this specific contract.",
  "risk_level": "Low" | "Medium" | "High",
  "risk_level_explanation": "One sentence explaining what is driving this risk level for this specific contract.",
  "next_steps": ["Up to 3 specific actionable steps for THIS contract (mention the client / rate / dates where useful) — no generic IR35 advice."]
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
