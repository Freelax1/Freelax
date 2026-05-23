'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const INPUT_CLS = 'w-full px-[14px] py-[11px] text-base leading-body text-white bg-white/[0.08] border border-white/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 font-[inherit] box-border transition-[border-color,box-shadow] duration-[150ms]'
const LABEL_CLS = 'block text-xs font-medium text-white/60 mb-1.5'

function Spinner() {
  return (
    <svg
      width="16" height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="animate-fd-spin shrink-0"
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
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-[3px] flex-1">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full transition-colors"
            style={{
              background: met
                ? i === 1 ? 'var(--success-500)' : i === 2 ? 'var(--success-500)' : len >= 12 ? 'var(--success-500)' : 'var(--border-default)'
                : i === 1 ? 'var(--warning-500)' : 'var(--border-default)',
            }}
          />
        ))}
      </div>
      <span className={cn('text-caption font-medium whitespace-nowrap', met ? 'text-[color:var(--success-400)]' : 'text-[color:var(--warning-400)]')}>
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
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.08)'
  }
  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
    e.currentTarget.style.boxShadow = 'none'
  }

  if (done) {
    return (
      <div className="text-center py-3">
        <div className="w-12 h-12 rounded-full inline-flex items-center justify-center mb-4 bg-white/[0.12]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
          Password updated
        </h2>
        <p className="text-sm leading-relaxed m-0 text-white/60">
          Redirecting you to sign in…
        </p>
        <Link href="/auth/login" className="inline-block mt-6 text-sm text-white font-semibold no-underline">
          Sign in now →
        </Link>
      </div>
    )
  }

  if (linkInvalid) {
    return (
      <div className="text-center py-3">
        <div className="w-12 h-12 rounded-full inline-flex items-center justify-center mb-4 bg-white/[0.12]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
          Link invalid or expired
        </h2>
        <p className="text-sm leading-relaxed m-0 text-white/60">
          Reset links expire after a short window. Request a new one to continue.
        </p>
        <Link href="/auth/forgot-password" className="inline-block mt-6 text-sm text-white font-semibold no-underline">
          Request new link →
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="auth-wordmark-mobile text-xl font-semibold mb-8 tracking-tighter">
        <span className="text-white">Free</span>
        <span className="text-white/70">lax</span>
        <span className="text-brand-primary">.</span>
      </div>

      <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
        Set a new password
      </h2>
      <p className="text-sm mt-0 mb-6 leading-normal text-white/60">
        Choose a strong password — at least 8 characters.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={LABEL_CLS}>New password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={INPUT_CLS}
            onFocus={focusInput}
            onBlur={blurInput}
          />
          <PasswordStrength password={password} />
        </div>

        <div>
          <label className={LABEL_CLS}>Confirm password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={INPUT_CLS}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        {error && (
          <p className="text-sm -mt-1 text-[color:var(--danger-400)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !ready}
          className="w-full mt-1 px-4 py-3 text-base font-semibold text-white border-none rounded-lg font-[inherit] flex items-center justify-center gap-2 transition-colors duration-[150ms] disabled:cursor-default"
          style={{ background: loading || !ready ? 'var(--forest-600)' : 'var(--brand-primary)' }}
          onMouseEnter={e => { if (!loading && ready) e.currentTarget.style.background = 'var(--forest-700)' }}
          onMouseLeave={e => { if (!loading && ready) e.currentTarget.style.background = 'var(--brand-primary)' }}
        >
          {loading && <Spinner />}
          {loading ? 'Updating…' : ready ? 'Update password' : 'Verifying link…'}
        </button>
      </form>

      <p className="text-sm text-center mt-[22px] mb-0 text-white/50">
        <Link href="/auth/login" className="text-white font-semibold no-underline">
          Back to sign in
        </Link>
      </p>
    </>
  )
}
