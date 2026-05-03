// app/api/auth/callback/hmrc/route.ts
// Handles the redirect back from HMRC after the user authorises the connection.
// Validates state, exchanges authorization code for tokens, stores in oauth_connections.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/hmrc/client'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('HMRC callback: NEXT_PUBLIC_APP_URL is not set')
    return new Response('Server misconfiguration', { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const settingsUrl = `${appUrl}/settings?tab=HMRC`

  // Handle HMRC returning an error (e.g. user denied permission)
  if (error) {
    console.error('HMRC OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(`${settingsUrl}&hmrc_error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}&hmrc_error=missing_params`)
  }

  // Validate state and retrieve code_verifier from cookie
  const cookieRaw = req.cookies.get('hmrc_oauth_state')?.value
  if (!cookieRaw) {
    return NextResponse.redirect(`${settingsUrl}&hmrc_error=session_expired`)
  }

  let storedState: string
  let codeVerifier: string
  try {
    const parsed = JSON.parse(cookieRaw)
    storedState  = parsed.state
    codeVerifier = parsed.codeVerifier
  } catch {
    return NextResponse.redirect(`${settingsUrl}&hmrc_error=invalid_state`)
  }

  if (state !== storedState) {
    return NextResponse.redirect(`${settingsUrl}&hmrc_error=state_mismatch`)
  }

  // Get the logged-in Freelax user
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Session expired during the HMRC flow — redirect to login
    return NextResponse.redirect(`${appUrl}/auth/login?redirectTo=/settings?tab=HMRC`)
  }

  // Exchange the authorization code for tokens
  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>
  try {
    tokens = await exchangeCodeForTokens(code, codeVerifier)
  } catch (err) {
    console.error('HMRC token exchange error:', err)
    return NextResponse.redirect(`${settingsUrl}&hmrc_error=token_exchange_failed`)
  }

  // Calculate token expiry timestamp
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Store tokens in oauth_connections (upsert — handles reconnection)
  const { error: dbError } = await supabase
    .from('oauth_connections')
    .upsert({
      user_id:       user.id,
      provider:      'hmrc',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry:  tokenExpiry,
      updated_at:    new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    })

  if (dbError) {
    console.error('Failed to store HMRC tokens:', dbError)
    return NextResponse.redirect(`${settingsUrl}&hmrc_error=storage_failed`)
  }

  // Clear the OAuth state cookie and redirect to Settings → HMRC tab
  const response = NextResponse.redirect(`${settingsUrl}&hmrc_connected=true`)
  response.cookies.delete('hmrc_oauth_state')
  return response
}
