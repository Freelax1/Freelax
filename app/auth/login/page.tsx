'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Field, Input } from '@/components/ui/input'
import Button from '@/components/ui/button'
import AuthSpinner from '@/components/auth-spinner'
import { AuthWordmark, AuthHeading, AuthError, AuthFooter } from '@/components/auth-ui'

function LoginFallback() {
  return <div className="h-[200px]" />
}

type FieldErrors = {
  email?: string
  password?: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function loginErrorMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Email or password is incorrect.'
  }
  return message
}

function validateFields(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    errors.email = 'Enter your email'
  } else if (!isValidEmail(trimmedEmail)) {
    errors.email = 'Enter a valid email address'
  }

  if (!password) {
    errors.password = 'Enter your password'
  }

  return errors
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    const validation = validateFields(email, password)
    setFieldErrors(validation)
    setError(null)

    if (validation.email || validation.password) {
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(loginErrorMessage(signInError.message))
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <>
      <AuthWordmark variant="mobile" />
      <AuthHeading title="Welcome back" subtitle="Sign in to your dashboard." />
      <AuthError>{error}</AuthError>

      <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
        <Field label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                setFieldErrors(prev => ({ ...prev, email: undefined }))
              }
              if (error) setError(null)
            }}
            placeholder="you@example.com"
            aria-invalid={!!fieldErrors.email}
          />
        </Field>

        <Field label="Password" error={fieldErrors.password}>
          <Input
            revealable
            autoComplete="current-password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              if (fieldErrors.password) {
                setFieldErrors(prev => ({ ...prev, password: undefined }))
              }
              if (error) setError(null)
            }}
            aria-invalid={!!fieldErrors.password}
          />
        </Field>
        <div className="flex justify-end -mt-2">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-text-secondary font-medium no-underline hover:text-text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" intent="primary" size="lg" fullWidth disabled={loading} className="mt-1">
          {loading && <AuthSpinner />}
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <AuthFooter>
        No account?{' '}
        <Link href="/auth/signup" className="font-semibold text-brand-primary no-underline hover:text-forest-700">
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
