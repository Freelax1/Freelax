import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/api/invoice-activity'

// Statuses that are allowed through this route.
// 'sent' must go via /api/invoices/send (sets sent_at + dispatches email).
// 'paid' must go via /api/invoices/mark-paid (sets paid_date).
// 'draft' is intentionally excluded — a sent/overdue/paid invoice cannot be
//   reverted to draft.  The client-side kebab already hides the option, but
//   this route enforces the rule server-side as well.
const ALLOWED_STATUSES = ['cancelled', 'overdue'] as const
type AllowedStatus = typeof ALLOWED_STATUSES[number]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { invoiceId, status } = await req.json()

  if (!ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json({ error: 'Invalid status. Use /send for sent, /mark-paid for paid.' }, { status: 400 })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('user_id, status')
    .eq('id', invoiceId)
    .single()

  if (!invoice || invoice.user_id !== user.id) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)

  await logActivity(supabase, invoiceId, user.id, 'status_changed', {
    from: invoice.status,
    to:   status,
  })

  return NextResponse.json({ success: true })
}
