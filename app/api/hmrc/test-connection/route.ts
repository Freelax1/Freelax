// app/api/hmrc/test-connection/route.ts
// Sandbox-only: verifies the stored HMRC token works and fraud prevention
// headers pass validation. Never enable in production.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
import { buildFraudPreventionHeaders } from '@/lib/hmrc/fraud-prevention'

const SANDBOX_ONLY = process.env.HMRC_SANDBOX_MODE === 'true'

export async function GET(request: NextRequest) {
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

  const fraudHeaders = buildFraudPreventionHeaders({
    request,
    userId: user.id,
    timezone: 'Europe/London',
    screenWidth: 1920,
    screenHeight: 1080,
    windowWidth: 1440,
    windowHeight: 900,
    doNotTrack: 'not-set',
    deviceId: user.id,
  })

  const hmrcRes = await fetch(
    'https://test-api.service.hmrc.gov.uk/test/fraud-prevention-headers/self-employment-business-mtd/validate',
    {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Accept': 'application/vnd.hmrc.1.0+json',
        ...fraudHeaders,
      },
    },
  )

  let body: unknown
  const contentType = hmrcRes.headers.get('content-type') ?? ''
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    body = await hmrcRes.json()
  } else {
    body = await hmrcRes.text()
  }

  return NextResponse.json({ status: hmrcRes.status, body })
}
