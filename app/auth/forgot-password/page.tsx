'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const INPUT_CLS = 'w-full px-3.5 py-3 text-base leading-body text-white bg-white/[0.08] border border-white/15 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 font-[inherit] box-border transition-[border-color,box-shadow] duration-[150ms]'
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
      <path d="M8 2a6 6 0 0 1 6 6" stroke="var(--text-on-dark)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
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
      <div className="text-center py-3">
        <div className="w-12 h-12 rounded-full inline-flex items-center justify-center mb-4 bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
          Check your email
        </h2>
        <p className="text-sm leading-relaxed m-0 text-white/60">
          If an account exists for <strong className="text-white">{email}</strong>, you'll receive a reset link shortly.
        </p>
        <p className="text-sm leading-relaxed mt-2 mb-0 text-white/50">
          Check your spam folder if it doesn't arrive within a few minutes.
        </p>
        <Link href="/auth/login" className="inline-block mt-6 text-sm text-white font-semibold no-underline">
          ← Back to sign in
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

      <Link
        href="/auth/login"
        className="text-xs text-white/50 no-underline inline-block mb-5 font-medium"
      >
        ← Back to sign in
      </Link>

      <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
        Reset your password
      </h2>
      <p className="text-sm mt-0 mb-6 leading-normal text-white/60">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={LABEL_CLS}>Email</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={INPUT_CLS}
            placeholder="you@example.com"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        {error && (
          <p className="text-sm -mt-1 text-[color:var(--danger-400)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-1 px-4 py-3 text-base font-semibold text-white border-none rounded-lg font-[inherit] flex items-center justify-center gap-2 transition-colors duration-[150ms] disabled:cursor-default"
          style={{ background: loading ? 'var(--forest-600)' : 'var(--brand-primary)' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--forest-700)' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--brand-primary)' }}
        >
          {loading && <Spinner />}
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </>
  )
}
