'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Field, Input, Label } from '@/components/ui/input'
import Button from '@/components/ui/button'
import AuthSpinner from '@/components/auth-spinner'
import { AuthWordmark, AuthHeading, AuthError, AuthFooter } from '@/components/auth-ui'

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

  return (
    <>
      <AuthWordmark variant="mobile" />
      <AuthHeading title="Welcome back" subtitle="Sign in to your dashboard." />
      <AuthError>{error}</AuthError>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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

        <div>
          <Label variant="auth">Password</Label>
          <Input
            variant="auth"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <div className="flex justify-end mt-1.5">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-white/60 font-medium no-underline hover:text-white/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          intent="auth"
          size="auth"
          fullWidth
          disabled={loading}
          className="mt-1"
        >
          {loading && <AuthSpinner />}
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <AuthFooter>
        No account?{' '}
        <Link href="/auth/signup" className="text-white font-semibold no-underline">
          Sign up free
        </Link>
      </AuthFooter>
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
