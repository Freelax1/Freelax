// Temporary test script — do not commit.
// Tests HMRC fraud prevention header validation against the sandbox endpoint.
// Run: node --use-system-ca scripts/test-fraud-headers.js

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Parse .env.local ────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
const envVars = {}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  envVars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
}

const CLIENT_ID     = envVars['HMRC_CLIENT_ID']
const CLIENT_SECRET = envVars['HMRC_CLIENT_SECRET']

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing HMRC_CLIENT_ID or HMRC_CLIENT_SECRET in .env.local')
  process.exit(1)
}

const BASE = 'https://test-api.service.hmrc.gov.uk'

const APIS = [
  'self-assessment-accounts-mtd',
  'self-assessment-mtd',
  'self-employment-business-mtd',
  'vat-mtd',
  'individuals-income-received-mtd',
]

// ── Fraud prevention headers (WEB_APP_VIA_SERVER) ──────────────────────────
function buildFraudHeaders() {
  const now = new Date().toISOString()
  return {
    'Gov-Client-Connection-Method':     'WEB_APP_VIA_SERVER',
    'Gov-Client-Public-IP':             '203.0.113.1',
    'Gov-Client-Public-IP-Timestamp':   now,
    'Gov-Client-Browser-JS-User-Agent': encodeURIComponent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
    'Gov-Client-Browser-Do-Not-Track':  'not-set',
    'Gov-Client-Browser-Plugins':       '',
    'Gov-Client-User-IDs':              'freelax-user-id=test-script-user',
    'Gov-Client-Device-ID':             'test-device-00000000-0000-0000-0000-000000000001',
    'Gov-Client-Timezone':              encodeURIComponent('Europe/London'),
    'Gov-Client-Screens':               'width=1920&height=1080&scaling-factor=1&colour-depth=24',
    'Gov-Client-Window-Size':           'width=1440&height=900',
    'Gov-Vendor-Product-Name':          'Freelax',
    'Gov-Vendor-Version':               'Freelax=1.0.0',
  }
}

// ── Step 1: Get application-restricted token ────────────────────────────────
console.log('Getting application-restricted token...')

const tokenRes = await fetch(`${BASE}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type:    'client_credentials',
  }),
})

if (!tokenRes.ok) {
  const body = await tokenRes.text()
  console.error(`Token request failed: ${tokenRes.status}`)
  console.error(body)
  process.exit(1)
}

const { access_token } = await tokenRes.json()
console.log('Token obtained.\n')

// ── Step 2: Poll each API's validation-feedback endpoint ────────────────────
const fraudHeaders = buildFraudHeaders()
const nonEmpty = []

for (const api of APIS) {
  const url = `${BASE}/test/fraud-prevention-headers/${api}/validation-feedback`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Accept':        'application/vnd.hmrc.1.0+json',
      ...fraudHeaders,
    },
  })

  let result
  try {
    result = await res.json()
  } catch {
    result = await res.text()
  }

  const hasRequests = Array.isArray(result?.requests) && result.requests.length > 0
  console.log(`${api}: HTTP ${res.status} — ${hasRequests ? `${result.requests.length} request(s) recorded` : 'empty'}`)

  if (hasRequests) {
    nonEmpty.push({ api, result })
  }
}

// ── Step 3: Print non-empty results ─────────────────────────────────────────
if (nonEmpty.length === 0) {
  console.log('\nNo recorded requests found for any API.')
} else {
  console.log(`\n── Non-empty results (${nonEmpty.length}) ──────────────────────────────`)
  for (const { api, result } of nonEmpty) {
    console.log(`\n[${api}]`)
    console.log(JSON.stringify(result, null, 2))
  }
}
