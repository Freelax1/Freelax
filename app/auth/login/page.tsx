'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const taglines = [
  'Stop guessing your tax bill.',
  'Send invoices in 30 seconds.',
  'Know exactly what\'s safe to spend.',
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
  const [taglineVisible, setTaglineVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineVisible(false)
      setTimeout(() => {
        setTaglineIdx(i => (i + 1) % taglines.length)
        setTaglineVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const avatars = ['A', 'J', 'S']

  const features = [
    'Tax calculated automatically',
    'IR35 assessment built in',
    'SA pack ready to download',
  ]

  return (
    <div
      className="auth-right"
      style={{
        flex: '0 0 45%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: "url('/right-panel-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
      }} />

      {/* Content — centered */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Wordmark — fix 2: dot is off-white so it shows against the image */}
          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
              Freelax<span style={{ color: '#FAFAF7' }}>.</span>
            </span>
          </div>

          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 8,
            marginBottom: 32,
            fontWeight: 400,
          }}>
            The finance app built for UK freelancers
          </p>

          {/* Animated tagline */}
          <p style={{
            fontSize: 26, fontWeight: 700, color: '#FFFFFF',
            lineHeight: 1.3, letterSpacing: '-0.02em',
            marginTop: 0, marginBottom: 0,
            opacity: taglineVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}>
            {taglines[taglineIdx]}
          </p>

          {/* Feature list — fix 3: marginTop 40 gap from tagline */}
          <div style={{ marginTop: 40 }}>
            {features.map((feat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#1D6B35', flexShrink: 0,
                }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  {feat}
                </span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {avatars.map((initial, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#1D6B35',
                  border: '2px solid rgba(255,255,255,0.2)',
                  marginLeft: i > 0 ? -8 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#FFFFFF',
                  flexShrink: 0,
                }}>
                  {initial}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              Join UK freelancers saving time on tax
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 48, marginBottom: 0 }}>
            Built in the UK · Encrypted &amp; never sold.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
          Freelax<span style={{ color: '#1D6B35' }}>.</span>
        </span>
      </div>
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
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
          Freelax<span style={{ color: '#1D6B35' }}>.</span>
        </span>
      </div>

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
          flex: '0 0 55%',
          minHeight: '100vh',
          backgroundColor: '#FAFAF7',
          backgroundImage: "url('/left-panel-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <Suspense fallback={<LoginFallback />}>
              <LoginForm />
            </Suspense>

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

        {/* Right — showcase panel */}
        <RightPanel />
      </div>
    </>
  )
}
