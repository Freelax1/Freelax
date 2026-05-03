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

// C1 fix: evaluate at call time so a missing NEXT_PUBLIC_APP_URL throws a clear
// error at request time rather than silently producing "undefined/api/auth/…"
// at module load time.
export function getHmrcRedirectUri(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL is not set — cannot build HMRC redirect URI')
  return `${url}/api/auth/callback/hmrc`
}

// H4 fix: cap raw HMRC error bodies before including them in thrown errors so
// credential fragments or large HTML error pages never reach log sinks.
function safeErrText(raw: string): string {
  return raw.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').slice(0, 200)
}

// C2 fix: validate credentials at call time in both token functions rather than
// relying on the non-null assertion operator (!) which silently passes undefined.
function requireHmrcCredentials(): { clientId: string; clientSecret: string } {
  const clientId     = process.env.HMRC_CLIENT_ID
  const clientSecret = process.env.HMRC_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('HMRC_CLIENT_ID and HMRC_CLIENT_SECRET must be configured')
  }
  return { clientId, clientSecret }
}

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
  const { clientId, clientSecret } = requireHmrcCredentials()

  const res = await fetch(HMRC_URLS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  getHmrcRedirectUri(),
      code_verifier: codeVerifier,
    }),
  })

  if (!res.ok) {
    const err = safeErrText(await res.text())
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
  const { clientId, clientSecret } = requireHmrcCredentials()

  const res = await fetch(HMRC_URLS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const err = safeErrText(await res.text())
    throw new Error(`HMRC token refresh failed: ${res.status} ${err}`)
  }

  return res.json()
}

/**
 * Make an authenticated GET request to the HMRC API.
 * Throws on non-OK responses so callers don't silently process error bodies.
 *
 * TODO: Add fraud prevention headers before production launch.
 * HMRC requires these by law for VAT API and soon all APIs.
 * See: https://developer.service.hmrc.gov.uk/guides/fraud-prevention
 */
export async function hmrcGet(path: string, accessToken: string): Promise<Response> {
  const res = await fetch(`${HMRC_URLS.api}${path}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.hmrc.1.0+json',
    },
  })
  if (!res.ok) {
    const err = safeErrText(await res.text())
    throw new Error(`HMRC GET ${path} failed: ${res.status} ${err}`)
  }
  return res
}

/**
 * Make an authenticated POST request to the HMRC API.
 * Throws on non-OK responses so callers don't silently process error bodies.
 */
export async function hmrcPost(path: string, accessToken: string, body: unknown): Promise<Response> {
  const res = await fetch(`${HMRC_URLS.api}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.hmrc.1.0+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = safeErrText(await res.text())
    throw new Error(`HMRC POST ${path} failed: ${res.status} ${err}`)
  }
  return res
}
