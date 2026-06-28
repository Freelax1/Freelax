// app/api/hmrc/vat/obligations/route.ts
// Returns the user's open VAT obligations from HMRC MTD-VAT.
// Called client-side so browser _fp context is collected and sent with the request.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens, buildHmrcRefreshCallback } from '@/lib/hmrc/token-crypto'
import { buildFraudPreventionHeaders, extractFpFromBody, fetchVendorIp } from '@/lib/hmrc/fraud-prevention'
import { hmrcGet } from '@/lib/hmrc/client'

type HmrcObligation = {
  start:     string
  end:       string
  due:       string
  status:    'O' | 'F'
  periodKey: string
}

function normaliseVrn(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

function isoFromOffset(daysOffset: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised', kind: 'unauthorised' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('vat_registration_number')
    .eq('id', user.id)
    .maybeSingle()
  const vrn = normaliseVrn(profile?.vat_registration_number?.toString().trim() ?? '')
  if (!vrn) {
    return NextResponse.json({ error: 'VAT Registration Number not set.', kind: 'no-vrn' }, { status: 400 })
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'HMRC account not connected.', kind: 'no-connection' }, { status: 403 })
  }

  let body: any = {}
  try { body = await request.json() } catch {}

  const fp = extractFpFromBody(body)
  const vendorIp = await fetchVendorIp()
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

  const refresh = buildHmrcRefreshCallback(user.id, tokens)
  const from = isoFromOffset(-365)
  const to   = isoFromOffset(0)

  try {
    const res = await hmrcGet(
      `/organisations/vat/${vrn}/obligations?from=${from}&to=${to}&status=O`,
      tokens.accessToken,
      fraudHeaders,
      '1.0',
      refresh,
    )
    const json = await res.json() as { obligations?: HmrcObligation[] }
    const obligations = (json.obligations ?? []).map(o => ({
      start:     o.start,
      end:       o.end,
      due:       o.due,
      status:    o.status,
      periodKey: o.periodKey,
    }))
    return NextResponse.json({ obligations })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not load VAT obligations.' },
      { status: 502 },
    )
  }
}
