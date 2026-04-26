'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
                ? i === 1 ? '#1D6B35' : i === 2 ? '#1D6B35' : len >= 12 ? '#1D6B35' : '#E2E8F0'
                : i === 1 ? '#F59E0B' : '#E2E8F0',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: met ? '#1D6B35' : '#F59E0B', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {!met ? 'Too short' : len >= 12 ? 'Strong' : 'Good'}
      </span>
    </div>
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

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 40px',
      }}>
        {/* Wordmark */}
        <div>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
            Freelax<span style={{ color: '#1D6B35' }}>.</span>
          </span>
        </div>

        {/* Centre content */}
        <div>
          <p style={{
            fontSize: 26, fontWeight: 700, color: '#FFFFFF',
            lineHeight: 1.3, letterSpacing: '-0.02em',
            marginTop: 0, marginBottom: 40,
            opacity: taglineVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}>
            {taglines[taglineIdx]}
          </p>

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
        </div>

        {/* Footer */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Built in the UK · Encrypted &amp; never sold.
        </p>
      </div>
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
    e.currentTarget.style.borderColor = '#1D6B35'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,107,53,0.12)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#E2E8F0'
    e.currentTarget.style.boxShadow = 'none'
  }

  const cardContent = done ? (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
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
        We sent a confirmation link to <strong style={{ color: '#0F172A' }}>{email}</strong>.
      </p>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
        Once confirmed, we'll take you through a quick setup.
      </p>
    </div>
  ) : (
    <>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 6 }}>
        Create your account
      </h2>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 0, marginBottom: 22 }}>
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
          {loading ? 'Creating account…' : 'Get started free'}
        </button>

        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6, margin: '4px 0 0' }}>
          By creating an account, you agree to our{' '}
          <Link href="/terms" style={{ color: '#64748B', textDecoration: 'underline' }}>Terms</Link>
          {' and '}
          <Link href="/privacy" style={{ color: '#64748B', textDecoration: 'underline' }}>Privacy Policy</Link>.
        </p>
      </form>

      <p style={{
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 22,
        marginBottom: 0,
        paddingTop: 18,
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: '#1D6B35', fontWeight: 600, textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>
    </>
  )

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
              {cardContent}
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

        {/* Right — showcase panel */}
        <RightPanel />
      </div>
    </>
  )
}
