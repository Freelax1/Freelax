// TEMPORARY — sandbox seeding only. Delete after use.
// Calls the HMRC sandbox test-only endpoint to create a self-employment
// business record for the signed-in user's NINO so that obligations and
// periods endpoints have data to work with.
//
// POST https://test-api.service.hmrc.gov.uk/individuals/business/self-employment/test-only/create

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
import {
  buildFraudPreventionHeaders,
  extractFpFromBody,
} from '@/lib/hmrc/fraud-prevention'
import { hmrcPost } from '@/lib/hmrc/client'

export async function POST(request: NextRequest) {
  if (process.env.HMRC_SANDBOX_MODE !== 'true') {
    return NextResponse.json(
      { error: 'This route only works in sandbox mode (HMRC_SANDBOX_MODE=true).' },
      { status: 403 },
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: any = {}
  try { body = await request.json() } catch {}

  const { data: profile } = await supabase
    .from('users')
    .select('nino')
    .eq('id', user.id)
    .maybeSingle()
  const nino = (profile?.nino ?? '').toString().replace(/\s+/g, '').toUpperCase()
  if (!nino) {
    return NextResponse.json(
      { error: 'National Insurance Number not set in Settings → HMRC.' },
      { status: 400 },
    )
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'HMRC account is not connected.' }, { status: 403 })
  }

  const fp = extractFpFromBody(body)
  const fraudHeaders = buildFraudPreventionHeaders({
    request,
    userId:       user.id,
    timezone:     fp.timezone      ?? 'Europe/London',
    screenWidth:  fp.screenWidth,
    screenHeight: fp.screenHeight,
    windowWidth:  fp.windowWidth,
    windowHeight: fp.windowHeight,
    doNotTrack:   fp.doNotTrack,
    deviceId:     fp.deviceId ?? user.id,
  })

  const payload = {
    nino,
    businessDetails: {
      typeOfBusiness:   'self-employment',
      tradingName:      body.tradingName      ?? 'Freelax Test Business',
      commencementDate: body.commencementDate ?? '2023-04-06',
      accountingType:   body.accountingType   ?? 'CASH',
    },
  }

  let hmrcRes: Response
  let responseBody: unknown
  try {
    hmrcRes = await hmrcPost(
      '/individuals/business/self-employment/test-only/create',
      tokens.accessToken,
      payload,
      fraudHeaders,
    )
    try { responseBody = await hmrcRes.json() } catch { responseBody = null }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'HMRC test-data request failed.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true, nino, payload, hmrcResponse: responseBody })
}
