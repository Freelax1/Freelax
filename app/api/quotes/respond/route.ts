import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logQuoteActivity } from '@/lib/api/quote-activity'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token  = searchParams.get('token')
  const action = searchParams.get('action')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, user_id, status, expiry_date')
    .eq('public_token', token)
    .single()

  if (!quote || error) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  if (quote.status !== 'sent') {
    return NextResponse.json(
      { error: `This quote cannot be responded to (current status: ${quote.status})` },
      { status: 400 }
    )
  }

  if (quote.expiry_date && new Date(quote.expiry_date) < new Date()) {
    return NextResponse.json({ error: 'This quote has expired' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const payload =
    action === 'accept'
      ? { status: 'accepted', accepted_at: now, updated_at: now }
      : { status: 'declined', declined_at: now, updated_at: now }

  await supabase.from('quotes').update(payload).eq('id', quote.id)

  const activityAction = action === 'accept' ? 'accepted' : 'declined'
  await logQuoteActivity(supabase, quote.id, quote.user_id, activityAction, { via: 'public_token' })
  await trackServer(quote.user_id, Events.QUOTE_RESPONDED, {
    quote_id: quote.id,
    response: action,
    via: 'public_token',
  })

  return NextResponse.redirect(new URL(`/q/${token}`, req.url), { status: 303 })
}
