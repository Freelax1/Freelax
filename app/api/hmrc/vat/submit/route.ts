// app/api/hmrc/vat/submit/route.ts
// Submits a 9-box VAT return to HMRC MTD-VAT API and records the submission
// in submission_periods with idempotent pre-insert.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens, buildHmrcRefreshCallback } from '@/lib/hmrc/token-crypto'
import {
  buildFraudPreventionHeaders,
  extractFpFromBody,
} from '@/lib/hmrc/fraud-prevention'
import { hmrcPost } from '@/lib/hmrc/client'

const PG_UNIQUE_VIOLATION = '23505'
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

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

  // Require an explicit declaration from the client — never assume.
  if (body?.declared !== true) {
    return NextResponse.json({ error: 'Declaration not confirmed.' }, { status: 400 })
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

  // Boxes 1–5: non-negative monetary values (decimals OK to 2dp).
  // Boxes 6–9: non-negative WHOLE pounds (HMRC requires integers).
  for (const [name, v] of Object.entries({ box1: box1!, box2: box2!, box3: box3!, box4: box4!, box5: box5! })) {
    if (v < 0) return NextResponse.json({ error: `${name} must be non-negative.` }, { status: 400 })
  }
  for (const [name, v] of Object.entries({ box6: box6!, box7: box7!, box8: box8!, box9: box9! })) {
    if (v < 0 || !Number.isInteger(v)) {
      return NextResponse.json({ error: `${name} must be a non-negative whole pound amount.` }, { status: 400 })
    }
  }

  // Server-side recomputation of derived boxes — never trust the client math.
  const expectedBox3 = Math.round((box1! + box2!) * 100) / 100
  const expectedBox5 = Math.round(Math.max(0, expectedBox3 - box4!) * 100) / 100
  if (Math.abs(box3! - expectedBox3) > 0.005) {
    return NextResponse.json({ error: 'Box 3 must equal Box 1 + Box 2.' }, { status: 400 })
  }
  if (Math.abs(box5! - expectedBox5) > 0.005) {
    return NextResponse.json({ error: 'Box 5 must equal max(0, Box 3 − Box 4).' }, { status: 400 })
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
  if (vrn.length !== 9 && vrn.length !== 12) {
    return NextResponse.json({ error: 'VAT Registration Number must be 9 or 12 digits.' }, { status: 400 })
  }

  const periodStart: string | undefined = typeof body?.periodStart === 'string' ? body.periodStart : undefined
  const periodEnd:   string | undefined = typeof body?.periodEnd   === 'string' ? body.periodEnd   : undefined
  if (!periodStart || !periodEnd || !ISO_DATE_REGEX.test(periodStart) || !ISO_DATE_REGEX.test(periodEnd)) {
    return NextResponse.json({ error: 'periodStart and periodEnd are required and must be YYYY-MM-DD.' }, { status: 400 })
  }
  if (periodStart > periodEnd) {
    return NextResponse.json({ error: 'periodStart must be on or before periodEnd.' }, { status: 400 })
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

  // Idempotency claim — same pattern as the ITSA submit route.
  const periodKeyCols = {
    business_id:  biz.id as string,
    period_start: periodStart,
    period_end:   periodEnd,
    period_type:  'vat_return' as const,
  }

  const { error: claimErr } = await supabase
    .from('submission_periods')
    .insert({ ...periodKeyCols, status: 'pending' })

  if (claimErr) {
    if (claimErr.code === PG_UNIQUE_VIOLATION) {
      const { data: existing } = await supabase
        .from('submission_periods')
        .select('status')
        .match(periodKeyCols)
        .maybeSingle()
      const status = existing?.status as string | undefined
      if (status === 'submitted' || status === 'accepted') {
        return NextResponse.json({ success: true, alreadySubmitted: true })
      }
      if (status === 'pending') {
        return NextResponse.json({ error: 'A submission for this period is already in progress.' }, { status: 409 })
      }
      const { error: upgradeErr } = await supabase
        .from('submission_periods')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .match(periodKeyCols)
      if (upgradeErr) {
        console.error('[vat/submit] idempotency upgrade-to-pending failed:', upgradeErr.code, upgradeErr.message, upgradeErr.details, upgradeErr.hint)
        return NextResponse.json({ error: 'Could not record submission.' }, { status: 500 })
      }
    } else {
      console.error('[vat/submit] idempotency claim INSERT failed:', claimErr.code, claimErr.message, claimErr.details, claimErr.hint)
      return NextResponse.json({ error: 'Could not record submission.' }, { status: 500 })
    }
  }

  // Decrypt HMRC tokens
  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    await supabase.from('submission_periods').update({ status: 'draft' }).match(periodKeyCols)
    return NextResponse.json({ error: 'HMRC account is not connected.' }, { status: 403 })
  }

  // Build fraud prevention headers (browser-side context lives in body._fp)
  const fpFromBody = extractFpFromBody(body)
  const fraudHeaders = buildFraudPreventionHeaders({
    request,
    userId:         user.id,
    timezone:       fpFromBody.timezone,
    screenWidth:    fpFromBody.screenWidth,
    screenHeight:   fpFromBody.screenHeight,
    scalingFactor:  fpFromBody.scalingFactor,
    colourDepth:    fpFromBody.colourDepth,
    windowWidth:    fpFromBody.windowWidth,
    windowHeight:   fpFromBody.windowHeight,
    doNotTrack:     fpFromBody.doNotTrack,
    userAgent:      fpFromBody.userAgent,
    browserPlugins: fpFromBody.browserPlugins,
    deviceId:       fpFromBody.deviceId,
  })

  const refresh = buildHmrcRefreshCallback(user.id, tokens)

  // Submit to HMRC
  const payload = {
    periodKey,
    vatDueSales:                  box1!,
    vatDueAcquisitions:           box2!,
    totalVatDue:                  expectedBox3,
    vatReclaimedCurrPeriod:       box4!,
    netVatDue:                    expectedBox5,
    totalValueSalesExVAT:         box6!,
    totalValuePurchasesExVAT:     box7!,
    totalValueGoodsSuppliedExVAT: box8!,
    totalAcquisitionsExVAT:       box9!,
    finalised:                    true,
  }

  let hmrcRes: Response
  let alreadySubmittedAtHmrc = false
  try {
    hmrcRes = await hmrcPost(
      `/organisations/vat/${vrn}/returns`,
      tokens.accessToken,
      payload,
      fraudHeaders,
      '1.0',
      refresh,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'HMRC submission failed.'
    if (/DUPLICATE_SUBMISSION|ALREADY_SUBMITTED|VAT_RETURN_EXISTS/i.test(msg)) {
      alreadySubmittedAtHmrc = true
      hmrcRes = new Response(null)
    } else {
      await supabase.from('submission_periods').update({ status: 'draft' }).match(periodKeyCols)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  // Finalise audit row.  Supabase never throws — must destructure { error }.
  {
    const { error: finaliseErr } = await supabase
      .from('submission_periods')
      .update({
        status:       'submitted',
        submitted_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .match(periodKeyCols)
    if (finaliseErr) {
      // Audit failure should not roll back a successful HMRC submission.
      console.error('[vat/submit] submission_periods finalise failed after HMRC accepted:', finaliseErr.code, finaliseErr.message, finaliseErr.details, finaliseErr.hint)
    }
  }

  // Drain HMRC body so the connection releases cleanly.
  try { await hmrcRes.text() } catch {}

  return NextResponse.json({ success: true, ...(alreadySubmittedAtHmrc && { alreadySubmitted: true }) })
}
