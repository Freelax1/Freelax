'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Events } from '@/lib/posthog-events'
import { captureEvent } from '@/lib/posthog'

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

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.6)',
  marginBottom: 6,
}

function Spinner() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'fd-spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      captureEvent(Events.PASSWORD_RESET_REQUESTED)
      setDone(true)
    }
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.08)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
    e.currentTarget.style.boxShadow = 'none'
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Check your email
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
          If an account exists for <strong style={{ color: '#FFFFFF' }}>{email}</strong>, you'll receive a reset link shortly.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
          Check your spam folder if it doesn't arrive within a few minutes.
        </p>
        <Link
          href="/auth/login"
          style={{
            display: 'inline-block',
            marginTop: 24,
            fontSize: 13,
            color: '#FFFFFF',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="auth-wordmark-mobile" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 32 }}>
        <span style={{ color: '#FFFFFF' }}>Free</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>lax</span>
        <span style={{ color: '#1D6B35' }}>.</span>
      </div>

      <Link
        href="/auth/login"
        style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'inline-block', marginBottom: 20, fontWeight: 500 }}
      >
        ← Back to sign in
      </Link>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: 8 }}>
        Reset your password
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 0, marginBottom: 24, lineHeight: 1.5 }}>
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={LABEL_STYLE}>Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={INPUT_STYLE}
            placeholder="you@example.com"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#F87171', marginTop: -4 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '12px 16px',
            background: loading ? '#4A7A5C' : '#1D6B35',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            transition: 'background 150ms',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#17582B' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1D6B35' }}
        >
          {loading && <Spinner />}
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </>
  )
}
