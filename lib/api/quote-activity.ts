import { SupabaseClient } from '@supabase/supabase-js'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

export type QuoteActivityAction =
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'status_changed'

const ACTION_EVENTS: Partial<Record<QuoteActivityAction, (typeof Events)[keyof typeof Events]>> = {
  sent: Events.QUOTE_SENT,
  accepted: Events.QUOTE_STATUS_UPDATED,
  declined: Events.QUOTE_STATUS_UPDATED,
  expired: Events.QUOTE_STATUS_UPDATED,
  status_changed: Events.QUOTE_STATUS_UPDATED,
}

/**
 * Append one entry to quote_activity.
 * Pass the already-authenticated supabase client from the calling route/page.
 *
 * Failures are intentionally swallowed — a logging error should never cause
 * the parent operation (send, mark-accepted, etc.) to fail.
 */
export async function logQuoteActivity(
  supabase: SupabaseClient,
  quoteId:  string,
  userId:   string,
  action:   QuoteActivityAction,
  metadata?: Record<string, unknown>,
) {
  try {
    await supabase.from('quote_activity').insert({
      quote_id: quoteId,
      user_id:  userId,
      action,
      metadata: metadata ?? null,
    })
    const event = ACTION_EVENTS[action]
    if (event) {
      await trackServer(userId, event, {
        quote_id: quoteId,
        action,
        ...metadata,
      })
    }
  } catch (e) {
    console.error('[logQuoteActivity] Failed to log activity:', e)
  }
}
