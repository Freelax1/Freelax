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

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64Image = Buffer.from(bytes).toString('base64')
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  // Pull VAT status + last 5 expense categories so the model can pick the user's
  // typical category instead of defaulting to "other".
  const [{ data: userData }, { data: recentExpenses }] = await Promise.all([
    supabase.from('users').select('vat_registered, business_type').eq('id', user.id).single(),
    supabase.from('expenses').select('category, merchant').eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5),
  ])

  const recentCategories = Array.from(new Set((recentExpenses ?? []).map(e => e.category).filter(Boolean)))
  const recentVendors    = Array.from(new Set((recentExpenses ?? []).map(e => e.merchant).filter(Boolean)))

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Image },
          },
          {
            type: 'text',
            text: `Extract expense details from this UK receipt for a ${userData?.business_type ?? 'sole_trader'} freelancer.

CONTEXT
- User is VAT registered: ${userData?.vat_registered ? 'YES — extract vat_amount if visible (UK standard rate 20%). If a VAT number is shown but no VAT line, infer vat_amount = total / 6.' : 'NO — set vat_amount to 0 (they cannot reclaim).'}
- Recently used categories: ${recentCategories.length ? recentCategories.join(', ') : 'none yet'}
- Recently used vendors: ${recentVendors.length ? recentVendors.join(', ') : 'none yet'}

If the receipt is unclear in places, give your best estimate and set "confidence" accordingly — never refuse to extract. Never leave a field null just because it's hard to read; only use null when the data is genuinely absent from the receipt.

Return ONLY valid JSON, no other text:
{
  "date": "YYYY-MM-DD or null",
  "merchant": "merchant name or null",
  "amount_ex_vat": number or null,
  "vat_amount": number or null,
  "category": "one of: office_supplies, travel, software, phone_internet, professional_fees, marketing, equipment, training, meals, other",
  "description": "brief description or null",
  "confidence": "high/medium/low"
}`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    await logAiCall(user.id, 'scan-receipt')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch (e) {
    console.error('Receipt scan error:', e)
    return NextResponse.json({ error: 'Failed to scan receipt' }, { status: 500 })
  }
}
