'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Field, Input } from '@/components/ui/input'
import Button from '@/components/ui/button'
import AuthSpinner from '@/components/auth-spinner'
import { AuthWordmark, AuthHeading, AuthError, AuthFooter } from '@/components/auth-ui'

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

  return (
    <>
      <AuthWordmark variant="mobile" />
      <AuthHeading
        title="Create your account"
        subtitle="Start managing your freelance finances in minutes."
      />
      <AuthError>{error}</AuthError>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <Field label="Full name" labelVariant="auth">
          <Input
            variant="auth"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Jane Smith"
          />
        </Field>

        <Field label="Email address" labelVariant="auth">
          <Input
            variant="auth"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </Field>

        <Field label="Password" labelVariant="auth">
          <Input
            variant="auth"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>

        <label className={`flex items-start gap-2.5 cursor-pointer px-3 py-2.5 rounded-lg transition-colors bg-white/[0.04] border ${terms ? 'border-brand-primary' : 'border-white/10'}`}>
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
            <span className="hidden sm:inline">
              , including Freelax processing my financial data and HMRC submissions on my behalf.
            </span>
            <span className="sm:hidden">
              , including data processing and HMRC submissions.
            </span>
          </span>
        </label>

        <Button
          type="submit"
          intent="auth"
          size="auth"
          fullWidth
          disabled={loading || !terms}
        >
          {loading && <AuthSpinner />}
          {loading ? 'Creating account…' : 'Create account →'}
        </Button>
      </form>

      <AuthFooter>
        Already have an account?{' '}
        <Link href="/auth/login" className="text-white font-semibold no-underline">
          Sign in
        </Link>
      </AuthFooter>
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
