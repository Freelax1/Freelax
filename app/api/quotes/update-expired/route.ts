// app/api/quotes/update-expired/route.ts
// Marks sent quotes as expired when past their expiry date

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logQuoteActivity } from '@/lib/api/quote-activity'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'sent')
    .lt('expiry_date', today)
    .select('id, quote_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data?.length) {
    await Promise.all(
      data.map(q => logQuoteActivity(supabase, q.id, user.id, 'expired', {
        quoteNumber: q.quote_number,
      }))
    )
  }

  return NextResponse.json({ updated: data?.length ?? 0, quotes: data })
}
