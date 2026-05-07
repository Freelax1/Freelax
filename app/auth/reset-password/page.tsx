'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [ready, setReady]       = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })

    ;(async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      // PKCE flow (@supabase/ssr default): Supabase redirects here with
      // ?code=<auth_code> — we must exchange it for a session ourselves.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          setLinkInvalid(true)
          return
        }
        // Strip the code so a refresh doesn't retry the (now-consumed) exchange.
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash)
        setReady(true)
        return
      }

      // Implicit flow: if access_token is in the hash, onAuthStateChange fires
      // PASSWORD_RECOVERY/SIGNED_IN automatically — nothing to do here.
      const hash = new URLSearchParams(window.location.hash.slice(1))
      if (hash.get('access_token')) return

      // No code, no hash token — check for an existing session (page refresh after PKCE exchange).
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) { setReady(true); return }

      // Nothing valid found — link is definitively invalid.
      setLinkInvalid(true)
    })()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    // Sign out the recovery session so the user logs in fresh with their new password.
    await supabase.auth.signOut()
    setTimeout(() => router.push('/auth/login'), 2000)
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
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Password updated
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
          Redirecting you to sign in…
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
          Sign in now →
        </Link>
      </div>
    )
  }

  if (linkInvalid) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: '50%',
          background: '#FEF2F2',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.01em' }}>
          Link invalid or expired
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
          Reset links expire after a short window. Request a new one to continue.
        </p>
        <Link
          href="/auth/forgot-password"
          style={{
            display: 'inline-block',
            marginTop: 24,
            fontSize: 13,
            color: '#1D6B35',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Request new link →
        </Link>
      </div>
    )
  }

  return (
    <>
      <style>{`@keyframes fd-spin { to { transform: rotate(360deg) } }`}</style>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', marginBottom: 8 }}>
        Set a new password
      </h2>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 0, marginBottom: 24, lineHeight: 1.5 }}>
        Choose a strong password — at least 8 characters.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={LABEL_STYLE}>New password</label>
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

        <div>
          <label style={LABEL_STYLE}>Confirm password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
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
          disabled={loading || !ready}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '12px 16px',
            background: loading || !ready ? '#4A7A5C' : '#1D6B35',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading || !ready ? 'default' : 'pointer',
            transition: 'background 150ms',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
          onMouseEnter={e => { if (!loading && ready) e.currentTarget.style.background = '#17582B' }}
          onMouseLeave={e => { if (!loading && ready) e.currentTarget.style.background = '#1D6B35' }}
        >
          {loading && <Spinner />}
          {loading ? 'Updating…' : ready ? 'Update password' : 'Verifying link…'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 22, marginBottom: 0 }}>
        <Link href="/auth/login" style={{ color: '#1D6B35', fontWeight: 600, textDecoration: 'none' }}>
          Back to sign in
        </Link>
      </p>
    </>
  )
}
