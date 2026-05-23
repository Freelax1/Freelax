'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
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
      <path d="M8 2a6 6 0 0 1 6 6" stroke="var(--text-on-dark)" strokeWidth="2" strokeLinecap="round" />
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
      <div className="auth-wordmark-mobile text-xl font-semibold mb-8 tracking-tighter">
        <span className="text-white">Free</span>
        <span className="text-white/70">lax</span>
        <span className="text-brand-primary">.</span>
      </div>

      <h2 className="text-xl font-semibold text-white tracking-tight mb-1.5">
        Create your account
      </h2>
      <p className="text-sm mt-0 mb-7 text-white/60">
        Start managing your freelance finances in minutes.
      </p>

      {error && (
        <div className="text-sm rounded-lg px-[14px] py-[10px] mb-4 border text-[color:var(--danger-300)] bg-[color:var(--danger-950)] border-[color:var(--danger-800)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="flex flex-col gap-4">

        <div>
          <label className={LABEL_CLS}>Full name</label>
          <input
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className={INPUT_CLS}
            placeholder="Jane Smith"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Email address</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={INPUT_CLS}
            placeholder="your@email.com"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        <div>
          <label className={LABEL_CLS}>Password</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={INPUT_CLS}
            placeholder="At least 8 characters"
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        {/* Terms + Privacy acceptance — required for HMRC production application */}
        <label className={`flex items-start gap-[10px] cursor-pointer px-3 py-[10px] rounded-lg transition-colors bg-white/[0.04] border ${terms ? 'border-brand-primary' : 'border-white/10'}`}>
          <input
            type="checkbox"
            checked={terms}
            onChange={e => setTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer [accent-color:var(--brand-primary)]"
          />
          <span className="text-xs leading-normal text-white/60">
            I agree to the{' '}
            <Link href="/privacy" target="_blank" className="text-white font-semibold no-underline">
              Privacy Policy
            </Link>
            {' '}and{' '}
            <Link href="/terms" target="_blank" className="text-white font-semibold no-underline">
              Terms of Service
            </Link>
            . By signing up, I consent to Freelax processing my financial data,
            including submitting information to HMRC on my behalf.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !terms}
          className="w-full px-4 py-3 text-base font-semibold text-white border-none rounded-lg font-[inherit] flex items-center justify-center gap-2 transition-colors duration-[150ms] disabled:cursor-not-allowed"
          style={{ background: loading || !terms ? 'var(--forest-600)' : 'var(--brand-primary)' }}
          onMouseEnter={e => { if (!loading && terms) e.currentTarget.style.background = 'var(--forest-700)' }}
          onMouseLeave={e => { if (!loading && terms) e.currentTarget.style.background = 'var(--brand-primary)' }}
        >
          {loading && <Spinner />}
          {loading ? 'Creating account…' : 'Create account →'}
        </button>

      </form>

      <p className="text-sm text-center mt-[22px] mb-0 pt-[18px] text-white/50 border-t border-white/10">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-white font-semibold no-underline">
          Sign in
        </Link>
      </p>
    </>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-[300px]" />}>
      <SignupForm />
    </Suspense>
  )
}
