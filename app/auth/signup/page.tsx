'use client'

import { Suspense, useState } from 'react'
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

function SignupForm() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [terms, setTerms]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!terms) {
      setError('You must accept the Privacy Policy and Terms of Service to continue.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase
        .from('users')
        .upsert(
          { id: data.user.id, terms_accepted_at: new Date().toISOString() },
          { onConflict: 'id' }
        )
    }

    router.push('/onboarding')
    router.refresh()
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
    e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(255,255,255,0.08)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
    e.currentTarget.style.boxShadow   = 'none'
  }

  return (
    <>
      <div
        className="auth-wordmark-mobile"
        style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 32 }}
      >
        <span style={{ color: '#FFFFFF' }}>Free</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>lax</span>
        <span style={{ color: '#1D6B35' }}>.</span>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', marginBottom: 6 }}>
        Create your account
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 0, marginBottom: 28 }}>
        Start managing your freelance finances in minutes.
      </p>

      {error && (
        <div style={{
          fontSize: 13,
          color: '#FCA5A5',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

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
            placeholder="Jane Smith"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>Email address</label>
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
            placeholder="At least 8 characters"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        {/* Terms + Privacy acceptance — required for HMRC production application */}
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          cursor: 'pointer',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${terms ? 'rgba(29,107,53,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8,
          transition: 'border-color 150ms',
        }}>
          <input
            type="checkbox"
            checked={terms}
            onChange={e => setTerms(e.target.checked)}
            style={{
              marginTop: 2,
              accentColor: '#1D6B35',
              width: 16,
              height: 16,
              flexShrink: 0,
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            I agree to the{' '}
            <Link
              href="/privacy"
              target="_blank"
              style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'none' }}
            >
              Privacy Policy
            </Link>
            {' '}and{' '}
            <Link
              href="/terms"
              target="_blank"
              style={{ color: '#FFFFFF', fontWeight: 600, textDecoration: 'none' }}
            >
              Terms of Service
            </Link>
            . By signing up, I consent to Freelax processing my financial data,
            including submitting information to HMRC on my behalf.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !terms}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: loading || !terms ? 'rgba(29,107,53,0.5)' : '#1D6B35',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading || !terms ? 'not-allowed' : 'pointer',
            transition: 'background 150ms',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onMouseEnter={e => { if (!loading && terms) e.currentTarget.style.background = '#17582B' }}
          onMouseLeave={e => { if (!loading && terms) e.currentTarget.style.background = '#1D6B35' }}
        >
          {loading && <Spinner />}
          {loading ? 'Creating account…' : 'Create account →'}
        </button>

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

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ height: 300 }} />}>
      <SignupForm />
    </Suspense>
  )
}
