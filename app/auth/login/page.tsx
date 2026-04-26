'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TAGLINES = [
  'Your finances, finally under control.',
  'Tax done. Invoices sent. Time saved.',
  'Built for UK freelancers, by UK freelancers.',
]

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

function RightPanel() {
  const [taglineIdx, setTaglineIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setTaglineIdx(i => (i + 1) % TAGLINES.length)
        setVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const avatars = [
    { initial: 'A', bg: '#1D6B35' },
    { initial: 'J', bg: '#2563EB' },
    { initial: 'S', bg: '#9333EA' },
  ]

  const features = [
    'Invoices & Quotes — get paid faster',
    'Tax pot — set aside exactly what you owe',
    'IR35 check — know your status in minutes',
  ]

  return (
    <div className="auth-right" style={{
      flex: '0 0 40%',
      minHeight: '100vh',
      background: '#111111',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '48px 40px',
    }}>
      {/* Wordmark */}
      <div>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
          Freelax<span style={{ color: '#1D6B35' }}>.</span>
        </span>
      </div>

      {/* Centre content */}
      <div>
        <p style={{
          fontSize: 26, fontWeight: 700, color: '#FFFFFF',
          lineHeight: 1.3, letterSpacing: '-0.02em',
          marginTop: 0, marginBottom: 40,
          opacity: visible ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}>
          {TAGLINES[taglineIdx]}
        </p>

        {features.map((feat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#1D6B35', flexShrink: 0,
            }} />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              {feat}
            </span>
          </div>
        ))}

        {/* Social proof */}
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex' }}>
            {avatars.map(({ initial, bg }, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: bg,
                border: '2px solid #111111',
                marginLeft: i > 0 ? -8 : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#FFFFFF',
                flexShrink: 0,
              }}>
                {initial}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            Joined by 1,200+ UK freelancers
          </span>
        </div>
      </div>

      {/* Footer */}
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
        Built in the UK · Encrypted &amp; never sold.
      </p>
    </div>
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

export default function LoginPage() {
  return (
    <>
      <style>{`
        @keyframes fd-spin { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          .auth-right { display: none !important; }
          .auth-left { flex: none !important; width: 100% !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex' }}>
        {/* Left — form */}
        <div className="auth-left" style={{
          flex: '0 0 60%',
          minHeight: '100vh',
          backgroundColor: '#FAFAF7',
          backgroundImage: 'radial-gradient(circle, #d0cfc8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.06)',
              padding: '36px 32px 32px',
            }}>
              <Suspense fallback={<LoginFallback />}>
                <LoginForm />
              </Suspense>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 28, marginBottom: 4, lineHeight: 1.7 }}>
              Built in the UK · Your data is encrypted and never sold.
            </p>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', margin: 0 }}>
              <Link href="/security" style={{ color: '#94A3B8', textDecoration: 'none' }}>Security</Link>
              {' · '}
              <Link href="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }}>Privacy</Link>
              {' · '}
              <Link href="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }}>Terms</Link>
            </p>
          </div>
        </div>

        {/* Right — dark panel */}
        <RightPanel />
      </div>
    </>
  )
}
