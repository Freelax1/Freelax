'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  fontSize: 16,
  lineHeight: 1.4,
  color: '#0F172A',
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 150ms, box-shadow 150ms',
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
      setDone(true)
    }
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#1D6B35'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,107,53,0.12)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#E2E8F0'
    e.currentTarget.style.boxShadow = 'none'
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <style>{`@keyframes fd-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{
          width: 48, height: 48,
          borderRadius: '50%',
          background: '#EAFAF0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D6B35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Check your email
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
          If an account exists for <strong style={{ color: '#0F172A' }}>{email}</strong>, you'll receive a reset link shortly.
        </p>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
          Check your spam folder if it doesn't arrive within a few minutes.
        </p>
        <Link
          href="/auth/login"
          style={{
            display: 'inline-block',
            marginTop: 24,
            fontSize: 13,
            color: '#1D6B35',
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
      <style>{`@keyframes fd-spin { to { transform: rotate(360deg) } }`}</style>

      <Link
        href="/auth/login"
        style={{ fontSize: 12, color: '#94A3B8', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}
      >
        ← Back to sign in
      </Link>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 8 }}>
        Reset your password
      </h2>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 0, marginBottom: 24, lineHeight: 1.5 }}>
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>
            Email
          </label>
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
          <p style={{ fontSize: 13, color: '#C0392B', marginTop: -4 }}>{error}</p>
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
