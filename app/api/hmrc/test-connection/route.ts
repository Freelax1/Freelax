// app/api/hmrc/test-connection/route.ts
// Sandbox-only: verifies the stored HMRC token works and fraud prevention
// headers pass validation. Never enable in production.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
import { buildFraudPreventionHeaders, extractFpFromBody } from '@/lib/hmrc/fraud-prevention'

const SANDBOX_ONLY = process.env.HMRC_SANDBOX_MODE === 'true'

export async function POST(request: NextRequest) {
  if (!SANDBOX_ONLY) {
    return NextResponse.json({ error: 'Only available in sandbox mode' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'No HMRC connection found. Connect your account first.' }, { status: 404 })
  }

  // Dynamically fetch this function's own public IP for Gov-Vendor-Public-IP / Gov-Vendor-Forwarded.
  // In production, set HMRC_VENDOR_IP env var instead to avoid the extra round-trip.
  let vendorIp: string | undefined
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    })
    const { ip } = await ipRes.json() as { ip: string }
    vendorIp = ip
  } catch {}

  let body: any = {}
  try { body = await request.json() } catch {}

  const fp = extractFpFromBody(body)
  const fraudHeaders = buildFraudPreventionHeaders({
    request,
    userId:         user.id,
    timezone:       fp.timezone,
    screenWidth:    fp.screenWidth,
    screenHeight:   fp.screenHeight,
    scalingFactor:  fp.scalingFactor,
    colourDepth:    fp.colourDepth,
    windowWidth:    fp.windowWidth,
    windowHeight:   fp.windowHeight,
    doNotTrack:     fp.doNotTrack,
    userAgent:      fp.userAgent,
    browserPlugins: fp.browserPlugins,
    deviceId:       fp.deviceId,
    vendorIp,
  })

  const hmrcRes = await fetch(
    'https://test-api.service.hmrc.gov.uk/test/fraud-prevention-headers/validate',
    {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Accept': 'application/vnd.hmrc.1.0+json',
        ...fraudHeaders,
      },
    },
  )

  let hmrcBody: unknown
  const contentType = hmrcRes.headers.get('content-type') ?? ''
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    hmrcBody = await hmrcRes.json()
  } else {
    hmrcBody = await hmrcRes.text()
  }

  return NextResponse.json({ status: hmrcRes.status, body: hmrcBody })
}
