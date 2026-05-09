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
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#0F172A',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
      maxWidth: 520,
      width: 'calc(100vw - 48px)',
    }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5, flex: 1 }}>
        We use strictly necessary cookies to keep you signed in. No tracking or advertising.{' '}
        <Link href="/privacy#cookies" style={{ color: '#FFFFFF', textDecoration: 'underline' }}>
          Learn more
        </Link>
      </p>
      <button
        onClick={dismiss}
        style={{
          background: '#1D6B35',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          padding: '7px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          fontFamily: 'inherit',
        }}
      >
        Got it
      </button>
    </div>
  )
}
