// app/api/quotes/update-status/route.ts
// Updates a quote's status and records an activity entry.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logQuoteActivity, type QuoteActivityAction } from '@/lib/api/quote-activity'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { quoteId, status } = await req.json()
  if (!quoteId || !status) {
    return NextResponse.json({ error: 'Missing quoteId or status' }, { status: 400 })
  }

  const { data: quote, error: fetchError } = await supabase
    .from('quotes')
    .select('id, user_id, status')
    .eq('id', quoteId)
    .single()

  if (fetchError || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error: updateError } = await supabase
    .from('quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', quoteId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const action: QuoteActivityAction =
    status === 'accepted' ? 'accepted' :
    status === 'declined' ? 'declined' :
    status === 'expired'  ? 'expired'  :
                            'status_changed'

  await logQuoteActivity(supabase, quoteId, user.id, action, {
    from: quote.status,
    to:   status,
  })

  return NextResponse.json({ success: true, from: quote.status, to: status })
}
