'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#64748B',
  marginBottom: 6,
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginFallback() {
  return (
    <>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 24 }}>
        Sign in
      </h2>
      <div style={{ height: 200 }} />
    </>
  )
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

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(redirectTo)
      router.refresh()
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

  return (
    <>
      <style>{`@keyframes fd-spin { to { transform: rotate(360deg) } }`}</style>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 24 }}>
        Sign in
      </h2>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Password</label>
            <Link
              href="/auth/forgot-password"
              style={{ fontSize: 12, color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={INPUT_STYLE}
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 22, marginBottom: 0 }}>
        No account?{' '}
        <Link href="/auth/signup" style={{ color: '#1D6B35', fontWeight: 600, textDecoration: 'none' }}>
          Sign up free
        </Link>
      </p>
    </>
  )
}
