// Server component — MTD for Income Tax obligations overview.
// Resolves the user's NINO + HMRC business id, decrypts HMRC tokens, and calls
// the Self-Employment Business obligations endpoint. Hands the resulting state
// to a client view for rendering.

import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
import { buildFraudPreventionHeaders } from '@/lib/hmrc/fraud-prevention'
import { hmrcGet } from '@/lib/hmrc/client'
import ItsaObligationsView, { type ItsaObligationView } from './itsa-obligations-view'

export const dynamic = 'force-dynamic'

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

// Map a period start date to its ITSA quarter number (1–4).
// Quarter boundaries: Q1 6 Apr, Q2 6 Jul, Q3 6 Oct, Q4 6 Jan.
function quarterFromStart(startIso: string): 1 | 2 | 3 | 4 {
  const d = new Date(startIso + 'T00:00:00Z')
  const m = d.getUTCMonth() + 1
  if (m >= 4 && m <= 6)  return 1
  if (m >= 7 && m <= 9)  return 2
  if (m >= 10 || m === 1) return 3
  return 4
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

async function ensureHmrcBusinessId(opts: {
  supabase:     ServerSupabase
  userId:       string
  nino:         string
  accessToken:  string
  fraudHeaders: Record<string, string>
}): Promise<{ businessId: string | null; bizRowId: string | null; error?: string }> {
  const { supabase, userId, nino, accessToken, fraudHeaders } = opts

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

  // Fall through: fetch from HMRC and persist.
  try {
    const res = await hmrcGet(
      `/individuals/business/details/${nino}/list`,
      accessToken,
      fraudHeaders,
      '2.0',
    )
    const json = (await res.json()) as HmrcBusinessListResponse
    console.log('[ensureHmrcBusinessId] HMRC business list response:', JSON.stringify(json, null, 2))
    const selfEmp = (json.listOfBusinesses ?? []).find(b => true)
    if (!selfEmp) return { businessId: null, bizRowId: biz.id as string }
    await supabase
      .from('businesses')
      .update({ hmrc_business_id: selfEmp.businessId })
      .eq('id', biz.id)
    return { businessId: selfEmp.businessId, bizRowId: biz.id as string }
  } catch (e) {
    return {
      businessId: null,
      bizRowId:   biz.id as string,
      error:      e instanceof Error ? e.message : 'Could not look up HMRC business.',
    }
  }
}

export default async function ItsaObligationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <ItsaObligationsView state={{ kind: 'unauthorised' }} />
  }

  const { data: profile } = await supabase
    .from('users')
    .select('nino')
    .eq('id', user.id)
    .maybeSingle()
  const nino = normaliseNino(profile?.nino?.toString().trim() ?? '')
  if (!nino) {
    return <ItsaObligationsView state={{ kind: 'no-nino' }} />
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return <ItsaObligationsView state={{ kind: 'no-connection' }} />
  }

  // Server-component shim — buildFraudPreventionHeaders only reads .headers.get(...).
  const hdrs = await headers()
  const requestLike = {
    headers: { get: (key: string) => hdrs.get(key) },
  } as unknown as NextRequest

  const fraudHeaders = buildFraudPreventionHeaders({
    request:  requestLike,
    userId:   user.id,
    timezone: 'Europe/London',
    deviceId: user.id,
  })

  const businessResult = await ensureHmrcBusinessId({
    supabase, userId: user.id, nino, accessToken: tokens.accessToken, fraudHeaders,
  })
  if (!businessResult.businessId) {
    if (businessResult.error) {
      return <ItsaObligationsView state={{ kind: 'error', message: businessResult.error }} />
    }
    return <ItsaObligationsView state={{ kind: 'no-business' }} />
  }

  let obligations: ItsaObligationView[]
  try {
    const res = await hmrcGet(
      `/individuals/business/self-employment/${nino}/${businessResult.businessId}/obligations`,
      tokens.accessToken,
      {
        ...fraudHeaders,
        ...(process.env.HMRC_SANDBOX_MODE === 'true' && { 'Gov-Test-Scenario': 'STATEFUL' }),
      },
      '5.0',
    )
    const json = (await res.json()) as HmrcObligationsResponse
    obligations = (json.obligations ?? [])
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
          status:    od.status === 'Fulfilled' ? 'Fulfilled' : 'Open',
          quarter:   start ? quarterFromStart(start) : null,
        } as ItsaObligationView
      }))
      .filter(o => o.periodKey && o.start && o.end && o.due)
  } catch (e) {
    return <ItsaObligationsView state={{
      kind: 'error',
      message: e instanceof Error ? e.message : 'Could not load ITSA obligations.',
    }} />
  }

  return <ItsaObligationsView state={{ kind: 'obligations', obligations }} />
}
