'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Field, Input } from '@/components/ui/input'
import Button from '@/components/ui/button'
import AuthSpinner from '@/components/auth-spinner'
import { AuthWordmark, AuthHeading, AuthError, AuthFooter, AuthStateHeading, AuthStateIcon } from '@/components/auth-ui'

function PasswordStrength({ password }: { password: string }) {
  const len = password.length
  if (len === 0) return null

  const met = len >= 8
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
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
      <span className={cn('text-caption font-medium whitespace-nowrap', met ? 'text-success-700' : 'text-warning-700')}>
        {!met ? 'Too short' : len >= 12 ? 'Strong' : 'Good'}
      </span>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
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

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (exchangeError) {
          setLinkInvalid(true)
          return
        }
        url.searchParams.delete('code')
        window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash)
        setReady(true)
        return
      }

      const hash = new URLSearchParams(window.location.hash.slice(1))
      if (hash.get('access_token')) return

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) {
        setReady(true)
        return
      }

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
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    await supabase.auth.signOut()
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  if (done) {
    return (
      <div className="text-center py-3">
        <AuthStateIcon tone="success">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </AuthStateIcon>
        <AuthStateHeading title="Password updated" />
        <p className="text-sm leading-relaxed m-0 text-text-secondary">
          Redirecting you to sign in…
        </p>
        <Link
          href="/auth/login"
          className="inline-block mt-6 text-sm font-semibold text-brand-primary no-underline hover:text-forest-700"
        >
          Sign in now →
        </Link>
      </div>
    )
  }

  if (linkInvalid) {
    return (
      <div className="text-center py-3">
        <AuthStateIcon tone="danger">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </AuthStateIcon>
        <AuthStateHeading title="Link invalid or expired" />
        <p className="text-sm leading-relaxed m-0 text-text-secondary">
          Reset links expire after a short window. Request a new one to continue.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block mt-6 text-sm font-semibold text-brand-primary no-underline hover:text-forest-700"
        >
          Request new link →
        </Link>
      </div>
    )
  }

  return (
    <>
      <AuthWordmark variant="mobile" />
      <AuthHeading
        title="Set a new password"
        subtitle="Choose a strong password — at least 8 characters."
      />
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="New password">
          <Input
            revealable
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <PasswordStrength password={password} />
        </Field>

        <Field label="Confirm password">
          <Input
            revealable
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
        </Field>

        <Button type="submit" intent="primary" size="lg" fullWidth disabled={loading || !ready} className="mt-1">
          {loading && <AuthSpinner />}
          {loading ? 'Updating…' : ready ? 'Update password' : 'Verifying link…'}
        </Button>
      </form>

      <AuthFooter>
        <Link href="/auth/login" className="font-semibold text-brand-primary no-underline hover:text-forest-700">
          Back to sign in
        </Link>
      </AuthFooter>
    </>
  )
}
