import posthog from 'posthog-js'
import type { PostHogEventName } from '@/lib/posthog-events'

export function isPostHogConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN)
}

export function identifyUser(userId: string, properties?: Record<string, string | undefined>) {
  if (!isPostHogConfigured()) return
  posthog.identify(userId, properties)
}

export function resetPostHogUser() {
  if (!isPostHogConfigured()) return
  posthog.reset()
}

export function captureEvent(event: PostHogEventName | string, properties?: Record<string, unknown>) {
  if (!isPostHogConfigured()) return
  posthog.capture(event, properties)
}
