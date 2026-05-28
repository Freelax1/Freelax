import { captureEvent, isPostHogConfigured } from '@/lib/posthog'
import type { PostHogEventName } from '@/lib/posthog-events'

/** Client-side product event (user should already be identified). */
export function track(userId: string, event: PostHogEventName, properties?: Record<string, unknown>) {
  if (!isPostHogConfigured()) return
  captureEvent(event, { user_id: userId, ...properties })
}
