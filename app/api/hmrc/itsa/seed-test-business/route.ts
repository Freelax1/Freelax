// TEMPORARY — seed-only route. Delete after calling once against the sandbox.
// Creates a self-employment business on the HMRC sandbox for the signed-in
// user's NINO so that obligations and periods endpoints have data to return.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
import {
  buildFraudPreventionHeaders,
  extractFpFromBody,
} from '@/lib/hmrc/fraud-prevention'
import { hmrcPost, HMRC_URLS } from '@/lib/hmrc/client'

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
    userId:      user.id,
    timezone:    fp.timezone     ?? 'Europe/London',
    screenWidth: fp.screenWidth,
    screenHeight: fp.screenHeight,
    windowWidth: fp.windowWidth,
    windowHeight: fp.windowHeight,
    doNotTrack:  fp.doNotTrack,
    deviceId:    fp.deviceId ?? user.id,
  })

  // HMRC sandbox: POST /individuals/business/self-employment/{nino}
  // Creates a self-employment business record on the sandbox.
  const seedPayload = {
    typeOfBusiness: 'self-employment',
    tradingName: body.tradingName ?? 'Freelax Test Business',
    commencementDate: body.commencementDate ?? '2023-04-06',
    accountingType: body.accountingType ?? 'CASH',
    address: {
      addressLine1: body.addressLine1 ?? '1 Test Street',
      postcode:     body.postcode     ?? 'SW1A 1AA',
      countryCode:  'GB',
    },
  }

  let hmrcRes: Response
  let responseBody: unknown
  try {
    hmrcRes = await hmrcPost(
      `/individuals/business/self-employment/${nino}`,
      tokens.accessToken,
      seedPayload,
      fraudHeaders,
    )
    try { responseBody = await hmrcRes.json() } catch { responseBody = null }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'HMRC seed request failed.' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    success: true,
    nino,
    payload: seedPayload,
    hmrcResponse: responseBody,
  })
}
