'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('freelax_cookie_notice_dismissed')
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    localStorage.setItem('freelax_cookie_notice_dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-toast bg-surface-card rounded-xl px-4 py-3 flex items-center gap-4 max-w-[520px] w-[calc(100vw-48px)] border border-border-default shadow-overlay">
      <p className="text-sm leading-relaxed flex-1 text-text-secondary">
        We use strictly necessary cookies to keep you signed in. No tracking or advertising.{' '}
        <Link href="/privacy#cookies" className="text-brand-primary font-medium underline">
          Learn more
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="bg-brand-primary text-white border-none rounded-lg px-3.5 py-2 text-sm font-semibold cursor-pointer shrink-0 font-[inherit]"
      >
        Got it
      </button>
    </div>
  )
}
