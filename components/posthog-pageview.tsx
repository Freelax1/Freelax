'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import posthog from 'posthog-js'
import { isPostHogConfigured } from '@/lib/posthog'

function PostHogPageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isPostHogConfigured() || !pathname) return

    let url = window.origin + pathname
    const query = searchParams.toString()
    if (query) url += `?${query}`

    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export function PostHogPageView() {
  if (!isPostHogConfigured()) return null

  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  )
}
