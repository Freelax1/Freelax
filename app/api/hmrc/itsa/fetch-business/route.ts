// app/api/hmrc/itsa/fetch-business/route.ts
// Looks up the user's HMRC self-employment business via the Business Details
// API and stores the businessId on the user's primary business row.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
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
  const nino = (profile?.nino ?? '').toString().replace(/\s+/g, '')
  if (!nino) {
    return NextResponse.json({ error: 'National Insurance Number not set in Settings → HMRC.' }, { status: 400 })
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'HMRC account is not connected.' }, { status: 403 })
  }

  const fp = extractFpFromBody(body)
  const fraudHeaders = buildFraudPreventionHeaders({
    request,
    userId: user.id,
    timezone:     fp.timezone     ?? 'Europe/London',
    screenWidth:  fp.screenWidth,
    screenHeight: fp.screenHeight,
    windowWidth:  fp.windowWidth,
    windowHeight: fp.windowHeight,
    doNotTrack:   fp.doNotTrack,
    deviceId:     fp.deviceId ?? user.id,
  })

  let businesses: HmrcBusiness[]
  try {
    const res = await hmrcGet(
      `/individuals/business/details/${nino}/list`,
      tokens.accessToken,
      fraudHeaders,
    )
    const json = await res.json() as { listOfBusinesses?: HmrcBusiness[] }
    businesses = json.listOfBusinesses ?? []
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not fetch HMRC businesses.' },
      { status: 502 },
    )
  }

  const selfEmp = businesses.find(b => b.typeOfBusiness === 'self-employment')
  if (!selfEmp) {
    return NextResponse.json(
      { error: 'No self-employment business found on your HMRC account.' },
      { status: 404 },
    )
  }

  const { data: biz } = await supabase
    .from('businesses')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .maybeSingle()
  if (!biz) {
    return NextResponse.json({ error: 'No primary business record found.' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('businesses')
    .update({ hmrc_business_id: selfEmp.businessId })
    .eq('id', biz.id)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ businessId: selfEmp.businessId })
}
