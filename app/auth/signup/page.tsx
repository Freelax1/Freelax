'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

function PasswordStrength({ password }: { password: string }) {
  const len = password.length
  if (len === 0) return null

  const met = len >= 8
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 99,
              background: met
                ? i === 1 ? '#1D6B35' : i === 2 ? '#1D6B35' : len >= 12 ? '#1D6B35' : 'rgba(255,255,255,0.15)'
                : i === 1 ? '#F59E0B' : 'rgba(255,255,255,0.15)',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: met ? '#4ADE80' : '#F59E0B', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {!met ? 'Too short' : len >= 12 ? 'Strong' : 'Good'}
      </span>
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      router.push('/onboarding')
    } else {
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
          We sent a confirmation link to <strong style={{ color: '#FFFFFF' }}>{email}</strong>.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
          Once confirmed, we'll take you through a quick setup.
        </p>
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

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: 6 }}>
        Let's get you set up.
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 0, marginBottom: 22 }}>
        Free to start. No card needed.
      </p>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={LABEL_STYLE}>Full name</label>
          <input
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={INPUT_STYLE}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

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

        <div>
          <label style={LABEL_STYLE}>Password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={INPUT_STYLE}
            onFocus={focusInput}
            onBlur={blurInput}
          />
          <PasswordStrength password={password} />
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
          {loading ? 'Creating account…' : 'Get started free'}
        </button>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.6, margin: '4px 0 0' }}>
          By creating an account, you agree to our{' '}
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>Terms</Link>
          {' and '}
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}>Privacy Policy</Link>.
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
