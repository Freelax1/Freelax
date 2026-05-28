import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { invoiceId } = await req.json()

  const { data: invoice } = await supabase
    .from('invoices').select('user_id, public_token').eq('id', invoiceId).single()
  if (!invoice || invoice.user_id !== user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return existing token or generate new one
  const token = invoice.public_token ?? randomBytes(20).toString('hex')
  if (!invoice.public_token) {
    await supabase.from('invoices').update({ public_token: token }).eq('id', invoiceId)
    await trackServer(user.id, Events.INVOICE_PUBLIC_LINK_CREATED, { invoice_id: invoiceId })
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/inv/${token}`
  return NextResponse.json({ token, url })
}
