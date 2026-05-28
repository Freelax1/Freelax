import { PostHog } from 'posthog-node'
import type { PostHogEventName } from '@/lib/posthog-events'

let posthogClient: PostHog | null = null

export function getPostHogServer() {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  if (!token) return null

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return posthogClient
}

export async function trackServer(
  distinctId: string,
  event: PostHogEventName | string,
  properties?: Record<string, unknown>,
) {
  const client = getPostHogServer()
  if (!client) return
  try {
    client.capture({
      distinctId,
      event,
      properties: { user_id: distinctId, ...properties },
    })
    await client.flush()
  } catch (e) {
    console.error('[posthog] trackServer failed:', e)
  }
}

export async function shutdownPostHogServer() {
  if (posthogClient) {
    await posthogClient.shutdown()
    posthogClient = null
  }
}
