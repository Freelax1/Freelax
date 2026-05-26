// app/api/hmrc/vat/submit/route.ts
// Submits a 9-box VAT return to HMRC MTD-VAT API and records the submission
// in submission_periods.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
import {
  buildFraudPreventionHeaders,
  extractFpFromBody,
} from '@/lib/hmrc/fraud-prevention'
import { hmrcPost } from '@/lib/hmrc/client'

function normaliseVrn(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return v
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const periodKey: string = typeof body?.periodKey === 'string' ? body.periodKey : ''
  if (!periodKey) {
    return NextResponse.json({ error: 'Missing periodKey' }, { status: 400 })
  }

  const box1 = num(body?.box1)
  const box2 = num(body?.box2)
  const box3 = num(body?.box3)
  const box4 = num(body?.box4)
  const box5 = num(body?.box5)
  const box6 = num(body?.box6)
  const box7 = num(body?.box7)
  const box8 = num(body?.box8)
  const box9 = num(body?.box9)
  if ([box1, box2, box3, box4, box5, box6, box7, box8, box9].some(v => v === null)) {
    return NextResponse.json({ error: 'All 9 boxes must be numeric.' }, { status: 400 })
  }

  // Look up the VRN
  const { data: profile } = await supabase
    .from('users')
    .select('vat_registration_number')
    .eq('id', user.id)
    .maybeSingle()
  const rawVrn = profile?.vat_registration_number?.toString().trim() ?? ''
  const vrn    = normaliseVrn(rawVrn)
  if (!vrn) {
    return NextResponse.json({ error: 'VAT Registration Number not set in Settings → HMRC.' }, { status: 400 })
  }

  // Decrypt HMRC tokens
  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'HMRC account is not connected.' }, { status: 403 })
  }

  // Build fraud prevention headers (browser-side context lives in body._fp)
  const fpFromBody = extractFpFromBody(body)
  const fraudHeaders = buildFraudPreventionHeaders({
    request,
    userId: user.id,
    timezone: fpFromBody.timezone ?? 'Europe/London',
    screenWidth:  fpFromBody.screenWidth,
    screenHeight: fpFromBody.screenHeight,
    windowWidth:  fpFromBody.windowWidth,
    windowHeight: fpFromBody.windowHeight,
    doNotTrack:   fpFromBody.doNotTrack,
    deviceId:     fpFromBody.deviceId ?? user.id,
  })

  // Submit to HMRC
  const payload = {
    periodKey,
    vatDueSales:                  box1,
    vatDueAcquisitions:           box2,
    totalVatDue:                  box3,
    vatReclaimedCurrPeriod:       box4,
    netVatDue:                    box5,
    totalValueSalesExVAT:         box6,
    totalValuePurchasesExVAT:     box7,
    totalValueGoodsSuppliedExVAT: box8,
    totalAcquisitionsExVAT:       box9,
    finalised:                    true,
  }

  let hmrcRes: Response
  try {
    hmrcRes = await hmrcPost(
      `/organisations/vat/${vrn}/returns`,
      tokens.accessToken,
      payload,
      fraudHeaders,
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'HMRC submission failed.' },
      { status: 502 },
    )
  }

  // Record the submission (audit trail).
  // submission_periods is keyed on business_id (see 20260503_mtd_phase1_foundation.sql);
  // resolve the user's primary business and upsert by (business_id, period_start, period_end, period_type).
  try {
    const periodStart: string | undefined = typeof body?.periodStart === 'string' ? body.periodStart : undefined
    const periodEnd:   string | undefined = typeof body?.periodEnd   === 'string' ? body.periodEnd   : undefined

    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle()

    if (biz && periodStart && periodEnd) {
      await supabase
        .from('submission_periods')
        .upsert({
          business_id:  biz.id,
          period_start: periodStart,
          period_end:   periodEnd,
          period_type:  'vat_return',
          status:       'submitted',
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'business_id,period_start,period_end' })
    }
  } catch (e) {
    // Audit failure should not roll back a successful HMRC submission.
    console.error('submission_periods upsert failed after successful HMRC submission:', e)
  }

  // Drain HMRC body so the connection releases cleanly.
  try { await hmrcRes.text() } catch {}

  return NextResponse.json({ success: true })
}
