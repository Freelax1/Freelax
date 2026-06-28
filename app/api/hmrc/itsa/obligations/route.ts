// app/api/hmrc/itsa/obligations/route.ts
// Returns the user's open ITSA quarterly obligations from HMRC.
// Called client-side so browser _fp context is collected and sent with the request.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens, buildHmrcRefreshCallback } from '@/lib/hmrc/token-crypto'
import { buildFraudPreventionHeaders, extractFpFromBody, fetchVendorIp } from '@/lib/hmrc/fraud-prevention'
import { hmrcGet, type HmrcRefreshCallback } from '@/lib/hmrc/client'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

type HmrcObligationsResponse = {
  obligations?: {
    typeOfBusiness?: string
    businessId?:     string
    obligationDetails?: {
      status?:    'Open' | 'Fulfilled'
      inboundCorrespondenceDateRange?: { startDate?: string; endDate?: string }
      inboundCorrespondenceDueDate?:   string
      periodKey?: string
    }[]
  }[]
}

type HmrcBusinessListResponse = {
  listOfBusinesses?: { businessId: string; typeOfBusiness?: string }[]
}

function normaliseNino(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function currentTaxYearDates(): { fromDate: string; toDate: string } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const d = now.getUTCDate()
  const start = (m > 4 || (m === 4 && d >= 6)) ? y : y - 1
  return { fromDate: `${start}-04-06`, toDate: `${start + 1}-04-05` }
}

function quarterFromStart(startIso: string): 1 | 2 | 3 | 4 {
  const d = new Date(startIso + 'T00:00:00Z')
  const m = d.getUTCMonth() + 1
  if (m >= 4 && m <= 6)  return 1
  if (m >= 7 && m <= 9)  return 2
  if (m >= 10 || m === 1) return 3
  return 4
}

async function ensureHmrcBusinessId(opts: {
  supabase:     ServerSupabase
  userId:       string
  nino:         string
  accessToken:  string
  fraudHeaders: Record<string, string>
  refresh:      HmrcRefreshCallback
}): Promise<{ businessId: string | null; bizRowId: string | null; error?: string }> {
  const { supabase, userId, nino, accessToken, fraudHeaders, refresh } = opts

  const { data: biz } = await supabase
    .from('businesses')
    .select('id, hmrc_business_id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle()

  if (!biz) return { businessId: null, bizRowId: null, error: 'No primary business record found.' }
  if (biz.hmrc_business_id) {
    return { businessId: biz.hmrc_business_id as string, bizRowId: biz.id as string }
  }

  try {
    const res = await hmrcGet(
      `/individuals/business/details/${nino}/list`,
      accessToken,
      fraudHeaders,
      '2.0',
      refresh,
    )
    const json = (await res.json()) as HmrcBusinessListResponse
    const selfEmp = (json.listOfBusinesses ?? []).find(
      b => b.typeOfBusiness === 'self-employment' || b.typeOfBusiness === 'sole-trader',
    )
    if (!selfEmp) return { businessId: null, bizRowId: biz.id as string }
    await supabase
      .from('businesses')
      .update({ hmrc_business_id: selfEmp.businessId })
      .eq('id', biz.id)
      .is('hmrc_business_id', null)
    return { businessId: selfEmp.businessId, bizRowId: biz.id as string }
  } catch (e) {
    return {
      businessId: null,
      bizRowId:   biz.id as string,
      error:      e instanceof Error ? e.message : 'Could not look up HMRC business.',
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised', kind: 'unauthorised' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('nino')
    .eq('id', user.id)
    .maybeSingle()
  const nino = normaliseNino(profile?.nino?.toString().trim() ?? '')
  if (!nino) {
    return NextResponse.json({ error: 'National Insurance Number not set.', kind: 'no-nino' }, { status: 400 })
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

  const businessResult = await ensureHmrcBusinessId({
    supabase, userId: user.id, nino, accessToken: tokens.accessToken, fraudHeaders, refresh,
  })
  if (!businessResult.businessId) {
    if (businessResult.error) {
      return NextResponse.json({ error: businessResult.error }, { status: 502 })
    }
    return NextResponse.json({ error: 'No self-employment business found.', kind: 'no-business' }, { status: 404 })
  }

  const { fromDate, toDate } = currentTaxYearDates()
  const obligationsPath =
    `/obligations/details/${nino}/income-and-expenditure` +
    `?typeOfBusiness=self-employment&businessId=${businessResult.businessId}` +
    `&fromDate=${fromDate}&toDate=${toDate}`

  try {
    const res = await hmrcGet(obligationsPath, tokens.accessToken, fraudHeaders, '3.0', refresh)
    const json = (await res.json()) as HmrcObligationsResponse
    const obligations = (json.obligations ?? [])
      .filter(o => o.typeOfBusiness === 'self-employment' || !o.typeOfBusiness)
      .flatMap(o => (o.obligationDetails ?? []).map(od => {
        const start = od.inboundCorrespondenceDateRange?.startDate ?? ''
        const end   = od.inboundCorrespondenceDateRange?.endDate   ?? ''
        const due   = od.inboundCorrespondenceDueDate              ?? ''
        const key   = od.periodKey                                  ?? ''
        return {
          periodKey: key,
          start,
          end,
          due,
          status:  od.status === 'Fulfilled' ? 'Fulfilled' : 'Open',
          quarter: start ? quarterFromStart(start) : null,
        }
      }))
      .filter(o => o.periodKey && o.start && o.end && o.due)
    return NextResponse.json({ obligations })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not load ITSA obligations.' },
      { status: 502 },
    )
  }
}
