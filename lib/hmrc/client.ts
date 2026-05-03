// lib/hmrc/client.ts
// HMRC API client helpers for MTD integration.
// All calls require a valid access token from oauth_connections.

const SANDBOX = process.env.HMRC_SANDBOX_MODE === 'true'

export const HMRC_URLS = {
  authorize: SANDBOX
    ? 'https://test-www.tax.service.gov.uk/oauth/authorize'
    : 'https://www.tax.service.gov.uk/oauth/authorize',
  token: SANDBOX
    ? 'https://test-api.service.hmrc.gov.uk/oauth/token'
    : 'https://api.service.hmrc.gov.uk/oauth/token',
  api: SANDBOX
    ? 'https://test-api.service.hmrc.gov.uk'
    : 'https://api.service.hmrc.gov.uk',
}

export const HMRC_SCOPES = [
  'read:self-assessment',
  'write:self-assessment',
  'read:vat',
  'write:vat',
].join(' ')

export const HMRC_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/hmrc`

/**
 * Exchange an authorization code for access and refresh tokens.
 * Called from the OAuth callback route.
 */
export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const res = await fetch(HMRC_URLS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.HMRC_CLIENT_ID!,
      client_secret: process.env.HMRC_CLIENT_SECRET!,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  HMRC_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HMRC token exchange failed: ${res.status} ${err}`)
  }

  return res.json()
}

/**
 * Refresh an access token using a refresh token.
 * HMRC refresh tokens are single-use — the response includes a new refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch(HMRC_URLS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.HMRC_CLIENT_ID!,
      client_secret: process.env.HMRC_CLIENT_SECRET!,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HMRC token refresh failed: ${res.status} ${err}`)
  }

  return res.json()
}

/**
 * Make an authenticated GET request to the HMRC API.
 * Automatically adds the Authorization and Accept headers.
 *
 * TODO: Add fraud prevention headers before production launch.
 * HMRC requires these by law for VAT API and soon all APIs.
 * See: https://developer.service.hmrc.gov.uk/guides/fraud-prevention
 */
export async function hmrcGet(path: string, accessToken: string): Promise<Response> {
  return fetch(`${HMRC_URLS.api}${path}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.hmrc.1.0+json',
    },
  })
}

/**
 * Make an authenticated POST request to the HMRC API.
 */
export async function hmrcPost(path: string, accessToken: string, body: unknown): Promise<Response> {
  return fetch(`${HMRC_URLS.api}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.hmrc.1.0+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}
