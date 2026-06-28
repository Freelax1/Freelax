// app/api/hmrc/itsa/submit-quarterly/route.ts
// Submits a quarterly ITSA update to HMRC's Self-Employment Business API and
// records the submission in submission_periods with idempotent pre-insert.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens, buildHmrcRefreshCallback } from '@/lib/hmrc/token-crypto'
import {
  buildFraudPreventionHeaders,
  extractFpFromBody,
} from '@/lib/hmrc/fraud-prevention'
import { hmrcPost } from '@/lib/hmrc/client'

const INCOME_KEYS = ['turnover', 'other'] as const
const EXPENSE_KEYS = [
  'costOfGoodsBought', 'staffCosts', 'travelCosts', 'premisesRunningCosts',
  'maintenanceCosts',  'adminCosts',  'advertisingCosts', 'professionalFees',
  'interest',          'other',
] as const

type IncomeKey  = typeof INCOME_KEYS[number]
type ExpenseKey = typeof EXPENSE_KEYS[number]

const NINO_REGEX = /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]?$/i
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const PG_UNIQUE_VIOLATION = '23505'

function normaliseNino(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Reads a single amount field; returns the rounded value or null on invalid input. */
function readAmount(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null
  return Math.round(v * 100) / 100
}

/** Reads a Record<K, number> from `input`. Returns null on the first invalid field, with that key. */
function readKeys<K extends string>(
  input: unknown,
  keys: readonly K[],
): { ok: true; values: Record<K, number> } | { ok: false; key: K } {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const out = {} as Record<K, number>
  for (const k of keys) {
    const v = readAmount(src[k])
    if (v === null) return { ok: false, key: k }
    out[k] = v
  }
  return { ok: true, values: out }
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

  const periodKey:   string | undefined = typeof body?.periodKey   === 'string' ? body.periodKey   : undefined
  const periodStart: string | undefined = typeof body?.periodStart === 'string' ? body.periodStart : undefined
  const periodEnd:   string | undefined = typeof body?.periodEnd   === 'string' ? body.periodEnd   : undefined
  if (!periodKey || !periodStart || !periodEnd) {
    return NextResponse.json({ error: 'Missing periodKey / periodStart / periodEnd.' }, { status: 400 })
  }
  if (!ISO_DATE_REGEX.test(periodStart) || !ISO_DATE_REGEX.test(periodEnd)) {
    return NextResponse.json({ error: 'periodStart and periodEnd must be YYYY-MM-DD.' }, { status: 400 })
  }
  if (periodStart > periodEnd) {
    return NextResponse.json({ error: 'periodStart must be on or before periodEnd.' }, { status: 400 })
  }

  const incomeRead   = readKeys<IncomeKey>(body?.income,   INCOME_KEYS)
  if (!incomeRead.ok) {
    return NextResponse.json({ error: `Income field "${incomeRead.key}" is not a non-negative finite number.` }, { status: 400 })
  }
  const expensesRead = readKeys<ExpenseKey>(body?.expenses, EXPENSE_KEYS)
  if (!expensesRead.ok) {
    return NextResponse.json({ error: `Expense field "${expensesRead.key}" is not a non-negative finite number.` }, { status: 400 })
  }
  const income   = incomeRead.values
  const expenses = expensesRead.values

  const { data: profile } = await supabase
    .from('users')
    .select('nino')
    .eq('id', user.id)
    .maybeSingle()
  const nino = normaliseNino(profile?.nino?.toString().trim() ?? '')
  if (!nino) {
    return NextResponse.json({ error: 'National Insurance Number not set in Settings → HMRC.' }, { status: 400 })
  }
  if (!NINO_REGEX.test(nino)) {
    return NextResponse.json({ error: 'National Insurance Number is not in a valid format.' }, { status: 400 })
  }

  const { data: biz } = await supabase
    .from('businesses')
    .select('id, hmrc_business_id')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .maybeSingle()
  const businessId = biz?.hmrc_business_id as string | undefined
  if (!biz || !businessId) {
    return NextResponse.json({ error: 'HMRC business id not yet linked. Open MTD overview to link it.' }, { status: 400 })
  }

  // Idempotency: try to claim this period with a 'pending' row before calling HMRC.
  // Unique constraint on (business_id, period_start, period_end, period_type) gives us
  // a 23505 on a concurrent request — we branch on the existing row's status.
  const periodKeyCols = {
    business_id:  biz.id as string,
    period_start: periodStart,
    period_end:   periodEnd,
    period_type:  'itsa_quarterly' as const,
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
      // Stale 'draft', 'not_started', 'amendment_required' — re-claim by upgrading to 'pending'.
      const { error: upgradeErr } = await supabase
        .from('submission_periods')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .match(periodKeyCols)
      if (upgradeErr) {
        console.error('[itsa/submit-quarterly] idempotency upgrade-to-pending failed:', upgradeErr.code, upgradeErr.message, upgradeErr.details, upgradeErr.hint)
        return NextResponse.json({ error: 'Could not record submission.' }, { status: 500 })
      }
    } else {
      console.error('[itsa/submit-quarterly] idempotency claim INSERT failed:', claimErr.code, claimErr.message, claimErr.details, claimErr.hint)
      return NextResponse.json({ error: 'Could not record submission.' }, { status: 500 })
    }
  }

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    await supabase.from('submission_periods').update({ status: 'draft' }).match(periodKeyCols)
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

  const payload = {
    from: periodStart,
    to:   periodEnd,
    incomes: {
      turnover: { amount: income.turnover },
      other:    { amount: income.other },
    },
    expenses: {
      costOfGoodsBought:    { amount: expenses.costOfGoodsBought },
      staffCosts:           { amount: expenses.staffCosts },
      travelCosts:          { amount: expenses.travelCosts },
      premisesRunningCosts: { amount: expenses.premisesRunningCosts },
      maintenanceCosts:     { amount: expenses.maintenanceCosts },
      adminCosts:           { amount: expenses.adminCosts },
      advertisingCosts:     { amount: expenses.advertisingCosts },
      professionalFees:     { amount: expenses.professionalFees },
      interest:             { amount: expenses.interest },
      other:                { amount: expenses.other },
    },
  }

  let hmrcRes: Response
  let alreadySubmittedAtHmrc = false
  try {
    hmrcRes = await hmrcPost(
      `/individuals/business/self-employment/${nino}/${businessId}/periods`,
      tokens.accessToken,
      payload,
      fraudHeaders,
      '5.0',
      refresh,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'HMRC submission failed.'
    // HMRC duplicate-submission codes — treat as success since the data is already at HMRC.
    if (/BUSINESS_INCOME_PERIOD_RESTRICTION|DUPLICATE_SUBMISSION|PERIOD_OVERLAPS|ALREADY_SUBMITTED/i.test(msg)) {
      alreadySubmittedAtHmrc = true
      hmrcRes = new Response(null)
    } else {
      // Revert claim so the user can fix and retry.
      await supabase.from('submission_periods').update({ status: 'draft' }).match(periodKeyCols)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  const totalIncome   = Math.round((income.turnover + income.other) * 100) / 100
  const totalExpenses = Math.round(
    Object.values(expenses).reduce((s, v) => s + v, 0) * 100,
  ) / 100
  const totalProfit   = Math.round((totalIncome - totalExpenses) * 100) / 100

  // Finalise audit row.  Supabase never throws — must destructure { error }.
  {
    const { error: finaliseErr } = await supabase
      .from('submission_periods')
      .update({
        status:         'submitted',
        submitted_at:   new Date().toISOString(),
        income_total:   totalIncome,
        expenses_total: totalExpenses,
        profit_total:   totalProfit,
        updated_at:     new Date().toISOString(),
      })
      .match(periodKeyCols)
    if (finaliseErr) {
      console.error('[itsa/submit-quarterly] submission_periods finalise failed after HMRC accepted:', finaliseErr.code, finaliseErr.message, finaliseErr.details, finaliseErr.hint)
    }
  }

  try { await hmrcRes.text() } catch {}

  return NextResponse.json({ success: true, ...(alreadySubmittedAtHmrc && { alreadySubmitted: true }) })
}
