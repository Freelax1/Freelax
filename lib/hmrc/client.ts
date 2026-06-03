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

const HMRC_API_TIMEOUT_MS   = 20_000
const HMRC_TOKEN_TIMEOUT_MS = 15_000

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
  return raw
    .replace(/Bearer\s+\S+/gi,           'Bearer [REDACTED]')
    .replace(/refresh_token=[^&\s]+/gi,  'refresh_token=[REDACTED]')
    .replace(/client_secret=[^&\s]+/gi,  'client_secret=[REDACTED]')
    .replace(/code=[^&\s]+/gi,           'code=[REDACTED]')
    .replace(/code_verifier=[^&\s]+/gi,  'code_verifier=[REDACTED]')
    .slice(0, 200)
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
    signal: AbortSignal.timeout(HMRC_TOKEN_TIMEOUT_MS),
  })

  if (!res.ok) {
    const err = safeErrText(await res.text())
    throw new Error(`HMRC token exchange failed: ${res.status} ${err}`)
  }

  return res.json()
}

/**
 * Refresh an access token using a refresh token.
 * HMRC refresh tokens are single-use — the response includes a new refresh token,
 * and the caller MUST persist the rotated pair atomically (see
 * refreshAndPersistHmrcTokens in token-crypto.ts).
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
    signal: AbortSignal.timeout(HMRC_TOKEN_TIMEOUT_MS),
  })

  if (!res.ok) {
    const err = safeErrText(await res.text())
    throw new Error(`HMRC token refresh failed: ${res.status} ${err}`)
  }

  return res.json()
}

/**
 * Callback that returns a freshly refreshed access token.
 * Created by route handlers via `buildHmrcRefreshCallback` so hmrcGet/hmrcPost
 * can recover from a mid-flight 401 without leaking persistence concerns into
 * this module.
 */
export type HmrcRefreshCallback = () => Promise<string>

/**
 * Make an authenticated GET request to the HMRC API.
 * On a 401, optionally refreshes the access token via `refresh` and retries
 * once. A second 401 indicates the user needs to reconnect HMRC.
 */
export async function hmrcGet(
  path: string,
  accessToken: string,
  extraHeaders?: Record<string, string>,
  version: string = '1.0',
  refresh?: HmrcRefreshCallback,
): Promise<Response> {
  const url = `${HMRC_URLS.api}${path}`
  const buildInit = (token: string): RequestInit => ({
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept':        `application/vnd.hmrc.${version}+json`,
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(HMRC_API_TIMEOUT_MS),
  })

  let res = await fetch(url, buildInit(accessToken))
  if (res.status === 401 && refresh) {
    let newToken: string
    try { newToken = await refresh() } catch {
      throw new Error('HMRC authentication failed — please reconnect HMRC.')
    }
    res = await fetch(url, buildInit(newToken))
    if (res.status === 401) {
      throw new Error('HMRC authentication failed — please reconnect HMRC.')
    }
  }
  if (!res.ok) {
    const err = safeErrText(await res.text())
    throw new Error(`HMRC GET ${path} failed: ${res.status} ${err}`)
  }
  return res
}

/**
 * Make an authenticated POST request to the HMRC API.
 * On a 401, optionally refreshes the access token via `refresh` and retries
 * once.
 */
export async function hmrcPost(
  path: string,
  accessToken: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
  version: string = '1.0',
  refresh?: HmrcRefreshCallback,
): Promise<Response> {
  const url = `${HMRC_URLS.api}${path}`
  const buildInit = (token: string): RequestInit => ({
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept':        `application/vnd.hmrc.${version}+json`,
      'Content-Type':  'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(HMRC_API_TIMEOUT_MS),
  })

  let res = await fetch(url, buildInit(accessToken))
  if (res.status === 401 && refresh) {
    let newToken: string
    try { newToken = await refresh() } catch {
      throw new Error('HMRC authentication failed — please reconnect HMRC.')
    }
    res = await fetch(url, buildInit(newToken))
    if (res.status === 401) {
      throw new Error('HMRC authentication failed — please reconnect HMRC.')
    }
  }
  if (!res.ok) {
    const err = safeErrText(await res.text())
    throw new Error(`HMRC POST ${path} failed: ${res.status} ${err}`)
  }
  return res
}
