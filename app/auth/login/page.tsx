'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const taglines = [
  "Know exactly what you owe. Instantly.",
  "See your real income after tax.",
  "Your business finances. Finally clear.",
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

const testimonials = [
  {
    quote: "Before Freelax, I had no idea what I owed. Now I know my exact tax bill every month.",
    name: "Sarah Jenkins",
    role: "Freelance UX Designer · London",
    initials: "SJ",
  },
  {
    quote: "As a contractor moving between IR35 statuses, Freelax is the first tool that actually keeps up.",
    name: "Marcus Chen",
    role: "IT Contractor · Manchester",
    initials: "MC",
  },
  {
    quote: "Running my consultancy used to mean weekends with spreadsheets. Now it takes 10 minutes a week.",
    name: "Priya Shah",
    role: "Marketing Consultant · Bristol",
    initials: "PS",
  },
]

function RightPanel() {
  const [taglineIdx, setTaglineIdx] = useState(0)
  const [taglineVisible, setTaglineVisible] = useState(true)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const [testimonialVisible, setTestimonialVisible] = useState(true)

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

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialVisible(false)
      setTimeout(() => {
        setTestimonialIdx(i => (i + 1) % testimonials.length)
        setTestimonialVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="auth-right"
      style={{
        flex: '0 0 40%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        overflowY: 'hidden',
        justifyContent: 'center',
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
        overflowY: 'hidden',
        padding: '100px 40px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, marginTop: 60 }}>
          <div style={{
            display: 'inline-block',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#1D6B35',
            background: '#EAFAF0',
            border: '0.5px solid rgba(29,107,53,0.2)',
            borderRadius: 20,
            padding: '3px 10px',
            marginBottom: 12,
          }}>
            v1.0 · Beta
          </div>

          {/* Animated tagline */}
          <div style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: 12,
            opacity: taglineVisible ? 1 : 0,
            transition: 'opacity 400ms ease',
            minHeight: 44,
          }}>
            {taglines[taglineIdx]}
          </div>

          <p style={{
            fontSize: 13,
            color: '#64748B',
            lineHeight: 1.5,
            marginBottom: 16,
            marginTop: -4,
          }}>
            Freelax shows your real income after tax — so you're never surprised again.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['✓ Real-time tax calculations', '✓ IR35 status clarity', '✓ Self Assessment ready'].map(pill => (
              <div key={pill} style={{
                background: '#fff',
                border: '0.5px solid #E2E8F0',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 600,
                color: '#1D6B35',
              }}>{pill}</div>
            ))}
          </div>

          <img
            src="/dashboard-mockup.svg"
            alt="Freelax dashboard preview"
            style={{
              width: '100%',
              maxWidth: 360,
              maxHeight: 200,
              objectFit: 'cover',
              objectPosition: 'top',
              borderRadius: 12,
              opacity: 0.92,
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          />

          {/* Testimonial card */}
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '0.5px solid #E2E8F0',
            padding: '12px 14px',
            marginBottom: 14,
            minHeight: 110,
          }}>
            <div style={{
              opacity: testimonialVisible ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}>
              <p style={{
                fontSize: 11,
                color: '#0F172A',
                lineHeight: 1.6,
                fontStyle: 'italic',
                marginBottom: 12,
              }}>
                "{testimonials[testimonialIdx].quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#1D6B35',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>{testimonials[testimonialIdx].initials}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{testimonials[testimonialIdx].name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{testimonials[testimonialIdx].role}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {['A', 'J', 'S'].map((initial, i) => (
              <div key={i} style={{
                width: 24, height: 24, borderRadius: '50%',
                background: '#1D6B35',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
                marginRight: -6,
                border: '2px solid #f0ede4',
                zIndex: 3 - i,
                position: 'relative',
              }}>{initial}</div>
            ))}
            <span style={{ fontSize: 11, color: '#64748B', marginLeft: 18 }}>
              Join UK freelancers who actually know their tax bill
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoginFallback() {
  return <div style={{ height: 200 }} />
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
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.08)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <>
      {/* Mobile-only wordmark (split wordmark is hidden on mobile) */}
      <div className="auth-wordmark-mobile" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 32 }}>
        <span style={{ color: '#FFFFFF' }}>Free</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>lax</span>
        <span style={{ color: '#1D6B35' }}>.</span>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: 24 }}>
        Welcome back.
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
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 500 }}
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 22, marginBottom: 0 }}>
        No account?{' '}
        <Link href="/auth/signup" style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'none' }}>
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
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', position: 'relative' }}>

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
          <span style={{ color: '#0F172A' }}>lax</span>
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
            <Suspense fallback={<LoginFallback />}>
              <LoginForm />
            </Suspense>

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
