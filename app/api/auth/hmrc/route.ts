// app/api/auth/hmrc/route.ts
// GET  — initiates HMRC OAuth flow (redirects user to HMRC authorization page)
// DELETE — disconnects HMRC account (deletes tokens from oauth_connections)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HMRC_URLS, HMRC_SCOPES, getHmrcRedirectUri } from '@/lib/hmrc/client'
import { createHash, randomBytes } from 'crypto'

// ── GET — initiate OAuth ───────────────────────────────────────────────────────

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  if (!process.env.HMRC_CLIENT_ID) {
    return NextResponse.json(
      { error: 'HMRC credentials not configured. Add HMRC_CLIENT_ID and HMRC_CLIENT_SECRET to environment variables.' },
      { status: 503 }
    )
  }

  // Generate PKCE code_verifier and code_challenge
  const codeVerifier  = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

  // Generate state for CSRF protection
  const state = randomBytes(32).toString('hex')

  // Build the HMRC authorization URL
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.HMRC_CLIENT_ID,
    scope:                 HMRC_SCOPES,
    state,
    redirect_uri:          getHmrcRedirectUri(),
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  })

  const authorizeUrl = `${HMRC_URLS.authorize}?${params.toString()}`

  // Store state + code_verifier in a short-lived HttpOnly cookie
  // These are verified and consumed in the callback route
  const cookieValue = JSON.stringify({ state, codeVerifier })
  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set('hmrc_oauth_state', cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
    sameSite: 'lax',
    maxAge:   600, // 10 minutes — enough time to complete the HMRC auth flow
    path:     '/api/auth/callback/hmrc',
  })

  return response
}

// ── DELETE — disconnect HMRC account ──────────────────────────────────────────

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { error } = await supabase
    .from('oauth_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'hmrc')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
