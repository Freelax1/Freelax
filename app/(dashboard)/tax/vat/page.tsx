// Server component — VAT obligations overview.
// Fetches the user's VRN, decrypts HMRC tokens, and calls HMRC's
// /organisations/vat/{vrn}/obligations endpoint, then hands the resulting
// state to a small client view for rendering.

import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens, buildHmrcRefreshCallback } from '@/lib/hmrc/token-crypto'
import { buildFraudPreventionHeaders } from '@/lib/hmrc/fraud-prevention'
import { hmrcGet, type HmrcRefreshCallback } from '@/lib/hmrc/client'
import VatObligationsView, { type ObligationView } from './vat-obligations-view'

export const dynamic = 'force-dynamic'

type HmrcObligation = {
  start:     string
  end:       string
  due:       string
  status:    'O' | 'F'
  periodKey: string
  received?: string
}

function normaliseVrn(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

function isoFromOffset(daysOffset: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}

async function fetchObligations(
  vrn: string,
  accessToken: string,
  fraudHeaders: Record<string, string>,
  refresh: HmrcRefreshCallback,
): Promise<HmrcObligation[]> {
  const from = isoFromOffset(-365)
  const to   = isoFromOffset(0)
  const path = `/organisations/vat/${vrn}/obligations?from=${from}&to=${to}&status=O`
  const res  = await hmrcGet(path, accessToken, fraudHeaders, '1.0', refresh)
  const body = await res.json() as { obligations?: HmrcObligation[] }
  return body.obligations ?? []
}

export default async function VatObligationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <VatObligationsView state={{ kind: 'unauthorised' }} />
  }

  const { data: profile } = await supabase
    .from('users')
    .select('vat_registration_number')
    .eq('id', user.id)
    .maybeSingle()

  const rawVrn = profile?.vat_registration_number?.toString().trim() ?? ''
  const vrn    = normaliseVrn(rawVrn)
  if (!vrn) {
    return <VatObligationsView state={{ kind: 'no-vrn' }} />
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return <VatObligationsView state={{ kind: 'no-connection' }} />
  }

  // Server-component shim — buildFraudPreventionHeaders only reads .headers.get(...)
  // so a minimal duck-typed object is enough.
  const hdrs = await headers()
  const requestLike = {
    headers: { get: (key: string) => hdrs.get(key) },
  } as unknown as NextRequest

  const fraudHeaders = buildFraudPreventionHeaders({
    request: requestLike,
    userId: user.id,
    timezone: 'Europe/London',
    deviceId: user.id,
  })

  const refresh = buildHmrcRefreshCallback(user.id, tokens)

  let obligations: ObligationView[]
  try {
    const raw = await fetchObligations(vrn, tokens.accessToken, fraudHeaders, refresh)
    obligations = raw.map(o => ({
      start:     o.start,
      end:       o.end,
      due:       o.due,
      status:    o.status,
      periodKey: o.periodKey,
    }))
  } catch (e) {
    return <VatObligationsView state={{
      kind: 'error',
      message: e instanceof Error ? e.message : 'Could not load VAT obligations.',
    }} />
  }

  return <VatObligationsView state={{ kind: 'ok', obligations }} />
}
