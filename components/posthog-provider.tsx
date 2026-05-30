'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { identifyUser, isPostHogConfigured, resetPostHogUser } from '@/lib/posthog'

function PostHogAuthSync() {
  useEffect(() => {
    if (!isPostHogConfigured()) return

    const supabase = createClient()

    const syncUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        identifyUser(user.id, { email: user.email ?? undefined })
      } else {
        resetPostHogUser()
      }
    }

    void syncUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        identifyUser(session.user.id, { email: session.user.email ?? undefined })
      } else {
        resetPostHogUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
    if (!token) return

    posthog.init(token, {
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-01-30',
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      capture_exceptions: true,
      debug: process.env.NODE_ENV === 'development',
    })
    setReady(true)
  }, [])

  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    return <>{children}</>
  }

  if (!ready) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogAuthSync />
      {children}
    </PHProvider>
  )
}
