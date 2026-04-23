import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/expenses',
  '/quotes',
  '/projects',
  '/clients',
  '/tax',
  '/settings',
  '/income',
  '/ir35',
  '/onboarding',
  '/api/invoices',
  '/api/expenses',
  '/api/quotes',
  '/api/projects',
  '/api/clients',
  '/api/tax',
  '/api/ai',
  '/api/settings',
  '/api/stripe',
]

// Public API paths that must NOT be caught by auth middleware
const PUBLIC_API_PATHS = [
  '/api/invoices/public-token',
  '/api/invoices/create-payment',
  '/api/invoices/payment-webhook',
  '/api/invoices/recurring',
  '/api/invoices/update-overdue',
  '/api/quotes/update-expired',
  '/api/stripe/webhook',
  '/api/accountant/accept',
]

const AUTH_ROUTES = ['/auth/login', '/auth/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Use getSession for middleware (fast, local cookie read — no network call)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const isPublicApi = PUBLIC_API_PATHS.some(p => pathname.startsWith(p))
  const isProtected = !isPublicApi && PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))

  if (!user && isProtected) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/invoices/:path*',
    '/expenses/:path*',
    '/quotes/:path*',
    '/projects/:path*',
    '/clients/:path*',
    '/tax/:path*',
    '/settings/:path*',
    '/income/:path*',
    '/ir35/:path*',
    '/onboarding/:path*',
    '/api/invoices/:path*',
    '/api/expenses/:path*',
    '/api/quotes/:path*',
    '/api/projects/:path*',
    '/api/clients/:path*',
    '/api/tax/:path*',
    '/api/ai/:path*',
    '/api/settings/:path*',
    '/api/stripe/:path*',
    '/auth/login',
    '/auth/signup',
  ],
}
