// app/api/quotes/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildQuoteHtml } from '@/lib/pdf/generate-invoice-pdf'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const quoteId = searchParams.get('id')
  if (!quoteId) return NextResponse.json({ error: 'Missing quote ID' }, { status: 400 })

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, clients(*), quote_line_items(*), projects(title)')
    .eq('id', quoteId)
    .single()

  if (!quote || quote.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: senderProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', quote.user_id)
    .single()

  await trackServer(user.id, Events.QUOTE_PDF_GENERATED, { quote_id: quoteId })
  const html = buildQuoteHtml(quote, senderProfile, true)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}
