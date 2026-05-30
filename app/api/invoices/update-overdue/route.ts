import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/api/invoice-activity'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('status', ['sent'])   // drafts are never sent so cannot be overdue
    .lt('due_date', today)
    .select('id, invoice_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log one activity entry per invoice that was flipped to overdue
  if (data?.length) {
    await Promise.all(
      data.map(inv => logActivity(supabase, inv.id, user.id, 'overdue', {}))
    )
    await trackServer(user.id, Events.INVOICES_MARKED_OVERDUE, { count: data.length })
  }

  return NextResponse.json({ updated: data?.length ?? 0, invoices: data })
}
