// app/api/hmrc/itsa/submit-quarterly/route.ts
// Submits a quarterly ITSA update to HMRC's Self-Employment Business API and
// records the submission in submission_periods.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDecryptedHmrcTokens } from '@/lib/hmrc/token-crypto'
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

function pickAmount(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return 0
  return Math.round(v * 100) / 100
}

function readKeys<K extends string>(input: unknown, keys: readonly K[]): Record<K, number> {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return keys.reduce((acc, k) => {
    acc[k] = pickAmount(src[k])
    return acc
  }, {} as Record<K, number>)
}

function normaliseNino(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
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

  const income   = readKeys<IncomeKey>(body?.income,   INCOME_KEYS)
  const expenses = readKeys<ExpenseKey>(body?.expenses, EXPENSE_KEYS)

  const { data: profile } = await supabase
    .from('users')
    .select('nino')
    .eq('id', user.id)
    .maybeSingle()
  const nino = normaliseNino(profile?.nino?.toString().trim() ?? '')
  if (!nino) {
    return NextResponse.json({ error: 'National Insurance Number not set in Settings → HMRC.' }, { status: 400 })
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

  const tokens = await getDecryptedHmrcTokens(user.id)
  if (!tokens) {
    return NextResponse.json({ error: 'HMRC account is not connected.' }, { status: 403 })
  }

  const fp = extractFpFromBody(body)
  const fraudHeaders = buildFraudPreventionHeaders({
    request,
    userId: user.id,
    timezone:     fp.timezone ?? 'Europe/London',
    screenWidth:  fp.screenWidth,
    screenHeight: fp.screenHeight,
    windowWidth:  fp.windowWidth,
    windowHeight: fp.windowHeight,
    doNotTrack:   fp.doNotTrack,
    deviceId:     fp.deviceId ?? user.id,
  })

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
  try {
    hmrcRes = await hmrcPost(
      `/individuals/business/self-employment/${nino}/${businessId}/periods`,
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

  const totalIncome   = Math.round((income.turnover + income.other) * 100) / 100
  const totalExpenses = Math.round(
    Object.values(expenses).reduce((s, v) => s + v, 0) * 100,
  ) / 100
  const totalProfit   = Math.round((totalIncome - totalExpenses) * 100) / 100

  try {
    await supabase
      .from('submission_periods')
      .upsert({
        business_id:    biz.id,
        period_start:   periodStart,
        period_end:     periodEnd,
        period_type:    'itsa_quarterly',
        status:         'submitted',
        submitted_at:   new Date().toISOString(),
        income_total:   totalIncome,
        expenses_total: totalExpenses,
        profit_total:   totalProfit,
      }, { onConflict: 'business_id,period_start,period_end' })
  } catch (e) {
    console.error('submission_periods upsert failed after successful HMRC submission:', e)
  }

  try { await hmrcRes.text() } catch {}

  return NextResponse.json({ success: true })
}
