'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Field, Input } from '@/components/ui/input'
import Button from '@/components/ui/button'
import AuthSpinner from '@/components/auth-spinner'
import { AuthWordmark, AuthHeading, AuthError, AuthStateHeading } from '@/components/auth-ui'

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

  if (done) {
    return (
      <div className="text-center py-3">
        <div className="w-12 h-12 rounded-full inline-flex items-center justify-center mb-4 bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <AuthStateHeading title="Check your email" />
        <p className="text-sm leading-relaxed m-0 text-white/60">
          If an account exists for <strong className="text-white">{email}</strong>, you&apos;ll receive a reset link shortly.
        </p>
        <p className="text-sm leading-relaxed mt-2 mb-0 text-white/50">
          Check your spam folder if it doesn&apos;t arrive within a few minutes.
        </p>
        <Link href="/auth/login" className="inline-block mt-6 text-sm text-white font-semibold no-underline">
          ← Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <AuthWordmark variant="mobile" />

      <Link
        href="/auth/login"
        className="text-xs text-white/50 no-underline inline-block mb-5 font-medium"
      >
        ← Back to sign in
      </Link>

      <AuthHeading
        title="Reset your password"
        subtitle="Enter your email and we'll send you a link to reset your password."
      />
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" labelVariant="auth">
          <Input
            variant="auth"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Button
          type="submit"
          intent="auth"
          size="auth"
          fullWidth
          disabled={loading}
          className="mt-1"
        >
          {loading && <AuthSpinner />}
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </>
  )
}
