'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

function LoginFallback() {
  return <div className="h-[200px]" />
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
      <div className="auth-wordmark-mobile text-xl font-semibold mb-8 tracking-tighter">
        <span className="text-white">Free</span>
        <span className="text-white/70">lax</span>
        <span className="text-brand-primary">.</span>
      </div>

      <h2 className="text-xl font-semibold text-white tracking-tight mb-6">
        Welcome back.
      </h2>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-medium text-white/60">Password</label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-white/60 font-medium no-underline"
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
          disabled={loading}
          className="w-full mt-1 px-4 py-3 text-base font-semibold text-white border-none rounded-lg font-[inherit] flex items-center justify-center gap-2 transition-colors duration-[150ms] disabled:cursor-default"
          style={{ background: loading ? 'var(--forest-600)' : 'var(--brand-primary)' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--forest-700)' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--brand-primary)' }}
        >
          {loading && <Spinner />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-center mt-[22px] mb-0 text-white/50">
        No account?{' '}
        <Link href="/auth/signup" className="text-white font-semibold no-underline">
          Sign up free
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
