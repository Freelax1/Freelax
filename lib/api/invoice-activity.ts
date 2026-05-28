import { SupabaseClient } from '@supabase/supabase-js'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

const ACTION_EVENTS: Partial<Record<string, (typeof Events)[keyof typeof Events]>> = {
  sent: Events.INVOICE_SENT,
  paid: Events.INVOICE_MARKED_PAID,
  chased: Events.INVOICE_CHASED,
  status_changed: Events.INVOICE_STATUS_UPDATED,
  overdue: Events.INVOICE_STATUS_UPDATED,
}

/**
 * Append one entry to invoice_activity.
 * Always pass the already-authenticated supabase server client from the calling
 * route so we reuse the same auth context and avoid an extra getUser() call.
 *
 * Failures are intentionally swallowed — a logging error should never cause
 * the parent operation (send, mark-paid, etc.) to fail.
 */
export async function logActivity(
  supabase:  SupabaseClient,
  invoiceId: string,
  userId:    string,
  action:    'sent' | 'paid' | 'chased' | 'status_changed' | 'overdue',
  metadata?: Record<string, unknown>,
) {
  try {
    await supabase.from('invoice_activity').insert({
      invoice_id: invoiceId,
      user_id:    userId,
      action,
      metadata:   metadata ?? null,
    })
    const event = ACTION_EVENTS[action]
    if (event) {
      await trackServer(userId, event, { invoice_id: invoiceId, ...metadata })
    }
  } catch (e) {
    console.error('[logActivity] Failed to log activity:', e)
  }
}
