// app/api/hmrc/itsa/fetch-business/route.ts
// Looks up the user's HMRC self-employment business via the Business Details
// API and stores the businessId on the user's primary business row.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens, buildHmrcRefreshCallback } from '@/lib/hmrc/token-crypto'
import {
  buildFraudPreventionHeaders,
  extractFpFromBody,
} from '@/lib/hmrc/fraud-prevention'
import { hmrcGet } from '@/lib/hmrc/client'

type HmrcBusiness = {
  businessId: string
  typeOfBusiness?: string
  tradingName?: string
}

const NINO_REGEX = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]?$/i

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Body is optional — only carries browser-side fraud-prevention context.
  let body: any = {}
  try { body = await request.json() } catch {}

  const { data: profile } = await supabase
    .from('users')
    .select('nino')
    .eq('id', user.id)
    .maybeSingle()
  const nino = (profile?.nino ?? '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!nino) {
    return NextResponse.json({ error: 'National Insurance Number not set in Settings → HMRC.' }, { status: 400 })
  }
  if (!NINO_REGEX.test(nino)) {
    return NextResponse.json({ error: 'National Insurance Number is not in a valid format.' }, { status: 400 })
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'HMRC account is not connected.' }, { status: 403 })
  }

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
  })

  const refresh = buildHmrcRefreshCallback(user.id, tokens)

  let businesses: HmrcBusiness[]
  try {
    const res = await hmrcGet(
      `/individuals/business/details/${nino}/list`,
      tokens.accessToken,
      fraudHeaders,
      '2.0',
      refresh,
    )
    const json = await res.json() as { listOfBusinesses?: HmrcBusiness[] }
    businesses = json.listOfBusinesses ?? []
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not fetch HMRC businesses.' },
      { status: 502 },
    )
  }

  const selfEmp = businesses.find(b => b.typeOfBusiness === 'self-employment' || b.typeOfBusiness === 'sole-trader')
  if (!selfEmp) {
    return NextResponse.json(
      { error: 'No self-employment business found on your HMRC account.' },
      { status: 404 },
    )
  }

  // Race-safe: only update if the column is still NULL. If two requests run
  // concurrently, the second one's UPDATE matches 0 rows — and that's fine,
  // the first request already linked the business id.
  const { data: updatedRows, error: updateError } = await supabase
    .from('businesses')
    .update({ hmrc_business_id: selfEmp.businessId })
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .is('hmrc_business_id', null)
    .select('id')

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  if (!updatedRows || updatedRows.length === 0) {
    // Column was already set — either by a concurrent request or a prior call.
    const { data: existing } = await supabase
      .from('businesses')
      .select('hmrc_business_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle()
    if (!existing?.hmrc_business_id) {
      return NextResponse.json({ error: 'No primary business record found.' }, { status: 404 })
    }
    return NextResponse.json({ businessId: existing.hmrc_business_id })
  }

  return NextResponse.json({ businessId: selfEmp.businessId })
}
