'use client'

import { useState } from 'react'
import Link from 'next/link'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  fontSize: 16,
  lineHeight: 1.4,
  color: '#FFFFFF',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 150ms, box-shadow 150ms',
}

export default function WaitlistPage() {
  const [email, setEmail] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    window.location.href = `mailto:hello@freelax.co.uk?subject=${encodeURIComponent(`Waitlist: ${email}`)}`
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.08)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <>
      <div className="auth-wordmark-mobile" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 32 }}>
        <span style={{ color: '#FFFFFF' }}>Free</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>lax</span>
        <span style={{ color: '#1D6B35' }}>.</span>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: 6 }}>
        Join the waitlist
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 0, marginBottom: 28 }}>
        Freelax is launching soon. Leave your email and we'll notify you the moment we open up.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={INPUT_STYLE}
          placeholder="your@email.com"
          onFocus={focusInput}
          onBlur={blurInput}
        />

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#1D6B35',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 150ms',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#17582B' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1D6B35' }}
        >
          Notify me when we launch →
        </button>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: '-4px 0 0' }}>
          No spam. Just one email when we go live.
        </p>
      </form>

      <p style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 22,
        marginBottom: 0,
        paddingTop: 18,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </>
  )
}
