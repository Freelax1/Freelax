import { SupabaseClient } from '@supabase/supabase-js'

export type QuoteActivityAction =
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'status_changed'

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
  } catch (e) {
    console.error('[logQuoteActivity] Failed to log activity:', e)
  }
}
