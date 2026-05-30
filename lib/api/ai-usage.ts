// lib/api/ai-usage.ts
// AI call logging and counting. Used by canUseAI() in plan-limits.ts
// and called from each AI route after a successful Anthropic response.

import { createServiceClient } from '@/lib/supabase/server'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

export type AiRoute =
  | 'tax-qa'
  | 'ir35-explain'
  | 'monthly-insight'
  | 'sa-narrative'
  | 'scan-receipt'
  | 'invoice-assist'

const AI_ROUTE_EVENTS: Record<AiRoute, (typeof Events)[keyof typeof Events]> = {
  'tax-qa': Events.AI_TAX_QA_USED,
  'ir35-explain': Events.AI_IR35_EXPLAIN_USED,
  'monthly-insight': Events.AI_MONTHLY_INSIGHT_USED,
  'sa-narrative': Events.AI_SA_NARRATIVE_USED,
  'scan-receipt': Events.AI_SCAN_RECEIPT_USED,
  'invoice-assist': Events.AI_INVOICE_ASSIST_USED,
}

/**
 * Logs a successful AI API call. Called after the Anthropic response succeeds.
 * Failures here are logged but not thrown — we never want logging to break the
 * actual user-facing AI response.
 */
export async function logAiCall(userId: string, route: AiRoute): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('ai_calls')
      .insert({ user_id: userId, route })
    if (error) {
      console.error('[ai-usage] Failed to log AI call', { userId, route, error })
    } else {
      await trackServer(userId, AI_ROUTE_EVENTS[route], { route })
    }
  } catch (e) {
    console.error('[ai-usage] Exception logging AI call', { userId, route, error: e })
  }
}

/**
 * Counts AI calls for a user in the current calendar month.
 * Calendar month, not rolling 30 days, so users get a clean reset on the 1st.
 */
export async function countAiCallsThisMonth(userId: string): Promise<number> {
  const supabase = createServiceClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('ai_calls')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString())

  if (error) {
    console.error('[ai-usage] Failed to count AI calls', { userId, error })
    // Fail-safe: if we can't count, deny the call rather than letting it through.
    // Returning a high number ensures canUseAI() rejects.
    return Number.MAX_SAFE_INTEGER
  }

  return count ?? 0
}
