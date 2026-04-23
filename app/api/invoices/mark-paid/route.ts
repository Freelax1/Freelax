import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/api/invoice-activity'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { invoiceId, paidDate } = await req.json()

  const { data: invoice } = await supabase.from('invoices').select('user_id').eq('id', invoiceId).single()
  if (!invoice || invoice.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const resolvedDate = paidDate ?? new Date().toISOString().slice(0, 10)

  await supabase.from('invoices').update({
    status: 'paid',
    paid_date: resolvedDate,
    updated_at: new Date().toISOString(),
  }).eq('id', invoiceId)

  await logActivity(supabase, invoiceId, user.id, 'paid', { paidDate: resolvedDate })

  return NextResponse.json({ success: true })
}
