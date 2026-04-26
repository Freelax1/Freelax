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

  return (
    <div
      className="auth-right"
      style={{
        flex: '0 0 40%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: "url('/left-panel-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Content — vertically centered with top clearance for wordmark */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '100px 40px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, marginTop: 80 }}>
          <img
            src="/dashboard-mockup.svg"
            alt="Freelax dashboard preview"
            style={{
              width: '100%',
              maxWidth: 360,
              borderRadius: 12,
              opacity: 0.92,
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          />
          <p style={{
            fontSize: 14,
            color: '#64748B',
            marginTop: 0,
            marginBottom: 32,
            fontWeight: 400,
          }}>
            The finance app built for UK freelancers
          </p>

          {/* Animated tagline */}
          <p style={{
            fontSize: 22, fontWeight: 700, color: '#0F172A',
            lineHeight: 1.3, letterSpacing: '-0.02em',
            marginTop: 0, marginBottom: 0,
            opacity: taglineVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}>
            {taglines[taglineIdx]}
          </p>

          {/* Social proof */}
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <span style={{ fontSize: 13, color: '#64748B' }}>
              Join UK freelancers saving time on tax
            </span>
          </div>
        </div>
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
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.08)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
    e.currentTarget.style.boxShadow = 'none'
  }

  const cardContent = done ? (
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
  ) : (
    <>
      {/* Mobile-only wordmark (split wordmark is hidden on mobile) */}
      <div className="auth-wordmark-mobile" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 32 }}>
        <span style={{ color: '#FFFFFF' }}>Free</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>lax</span>
        <span style={{ color: '#1D6B35' }}>.</span>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: 6 }}>
        Create your account
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

  return (
    <>
      <style>{`
        @keyframes fd-spin { to { transform: rotate(360deg) } }
        .auth-left input::placeholder { color: rgba(255,255,255,0.35) !important; }
        /* Mobile: hide right panel and split wordmark; show mobile wordmark */
        @media (max-width: 768px) {
          .auth-right { display: none !important; }
          .auth-left { flex: none !important; width: 100% !important; justify-content: center !important; padding-bottom: 48px !important; }
          .auth-split-wordmark { display: none !important; }
          .auth-wordmark-mobile { display: block !important; }
        }
        /* Desktop: hide mobile wordmark; show split wordmark */
        @media (min-width: 769px) {
          .auth-wordmark-mobile { display: none !important; }
          .auth-split-wordmark { display: flex !important; }
        }
      `}</style>

      {/* Page wrapper — position relative so the split wordmark can be absolutely placed */}
      <div style={{ minHeight: '100vh', display: 'flex', position: 'relative' }}>

        {/* Split wordmark — top of page, split aligned to 60/40 panel boundary */}
        <div
          className="auth-split-wordmark"
          style={{
            position: 'absolute',
            top: 48,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'flex-start',
            paddingLeft: 'calc(60% - 124px)',
            alignItems: 'baseline',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Free</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>lax</span>
          <span style={{ color: '#1D6B35' }}>.</span>
        </div>

        {/* Left — dark green form panel */}
        <div className="auth-left" style={{
          flex: '0 0 60%',
          minHeight: '100vh',
          backgroundImage: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/right-panel-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '140px 32px 48px',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            {cardContent}

            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 28, marginBottom: 4, lineHeight: 1.7 }}>
              Built in the UK · Your data is encrypted and never sold.
            </p>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              <Link href="/security" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Security</Link>
              {' · '}
              <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacy</Link>
              {' · '}
              <Link href="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Terms</Link>
            </p>
          </div>
        </div>

        {/* Right — light mockup panel */}
        <RightPanel />
      </div>
    </>
  )
}
