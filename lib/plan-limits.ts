// lib/plan-limits.ts
// ─────────────────────────────────────────────────────────────────────────────
// Plan limits for each Freelax subscription tier.
// To bypass all limits during development:
//   → Go to Supabase → Table Editor → users → find your row
//   → Set subscription_plan = 'studio'
//   → Studio has unlimited everything
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'

export type Plan = 'free' | 'solo' | 'pro' | 'studio'

export interface PlanLimits {
  invoicesPerMonth:    number   // -1 = unlimited
  clientsTotal:        number   // -1 = unlimited
  expensesPerMonth:    number   // -1 = unlimited
  aiCallsPerMonth:     number   // -1 = unlimited
  canSendByEmail:      boolean
  canUseStripe:        boolean
  canUseRecurring:     boolean
  canInviteAccountant: boolean
  canUseIR35:          boolean
  canUseMileage:       boolean
  canExport:           boolean
  quotesPerMonth:      number   // -1 = unlimited
  seats:               number
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    invoicesPerMonth:    3,
    clientsTotal:        1,
    expensesPerMonth:    10,
    aiCallsPerMonth:     5,
    canSendByEmail:      false,
    canUseStripe:        false,
    canUseRecurring:     false,
    canInviteAccountant: false,
    canUseIR35:          false,
    canUseMileage:       false,
    canExport:           false,
    quotesPerMonth:      1,
    seats:               1,
  },
  solo: {
    invoicesPerMonth:    -1,
    clientsTotal:        5,
    expensesPerMonth:    -1,
    aiCallsPerMonth:     50,
    canSendByEmail:      true,
    canUseStripe:        true,
    canUseRecurring:     false,
    canInviteAccountant: false,
    canUseIR35:          false,
    canUseMileage:       true,
    canExport:           true,
    quotesPerMonth:      -1,
    seats:               1,
  },
  pro: {
    invoicesPerMonth:    -1,
    clientsTotal:        -1,
    expensesPerMonth:    -1,
    aiCallsPerMonth:     150,
    canSendByEmail:      true,
    canUseStripe:        true,
    canUseRecurring:     true,
    canInviteAccountant: true,
    canUseIR35:          true,
    canUseMileage:       true,
    canExport:           true,
    quotesPerMonth:      -1,
    seats:               1,
  },
  studio: {
    invoicesPerMonth:    -1,
    clientsTotal:        -1,
    expensesPerMonth:    -1,
    aiCallsPerMonth:     750,
    canSendByEmail:      true,
    canUseStripe:        true,
    canUseRecurring:     true,
    canInviteAccountant: true,
    canUseIR35:          true,
    canUseMileage:       true,
    canExport:           true,
    quotesPerMonth:      -1,
    seats:               1,
  },
}

// ── Get the current user's plan limits ───────────────────────────────────────

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('subscription_plan')
    .eq('id', userId)
    .single()
  return (data?.subscription_plan as Plan) ?? 'free'
}

export function getLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

// ── Specific limit checkers ───────────────────────────────────────────────────

// NOTE — TOCTOU: these preflight functions are advisory UI hints called before
// client-side Supabase inserts. True atomic enforcement is provided by the
// BEFORE INSERT triggers (trg_invoices_monthly_limit, trg_clients_total_limit,
// trg_expenses_monthly_limit) in migration 20260503_atomic_quota_and_chase.sql.
// Apply that migration in the Supabase SQL editor to activate DB-level guards.

export async function canCreateInvoice(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (limits.invoicesPerMonth === -1) return { allowed: true }

  const supabase = createClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString())

  if ((count ?? 0) >= limits.invoicesPerMonth) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows ${limits.invoicesPerMonth} invoices per month. Upgrade to Pro for unlimited invoices.`,
    }
  }
  return { allowed: true }
}

export async function canCreateClient(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (limits.clientsTotal === -1) return { allowed: true }

  const supabase = createClient()
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')

  if ((count ?? 0) >= limits.clientsTotal) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows ${limits.clientsTotal} active client${limits.clientsTotal === 1 ? '' : 's'}. Upgrade to Pro for unlimited clients.`,
    }
  }
  return { allowed: true }
}

export async function canCreateExpense(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (limits.expensesPerMonth === -1) return { allowed: true }

  const supabase = createClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString())

  if ((count ?? 0) >= limits.expensesPerMonth) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows ${limits.expensesPerMonth} expenses per month. Upgrade to Pro for unlimited expenses.`,
    }
  }
  return { allowed: true }
}

export async function canUseAI(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number; limit?: number }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (limits.aiCallsPerMonth === 0) {
    return {
      allowed: false,
      reason: 'AI features are not available on your current plan.',
      remaining: 0,
      limit: 0,
    }
  }

  if (limits.aiCallsPerMonth === -1) {
    return { allowed: true } // unlimited (no current tier uses this, kept for future)
  }

  const { countAiCallsThisMonth } = await import('@/lib/api/ai-usage')
  const used = await countAiCallsThisMonth(userId)
  const remaining = Math.max(0, limits.aiCallsPerMonth - used)

  if (used >= limits.aiCallsPerMonth) {
    const upgradeMsg =
      plan === 'free'   ? 'Upgrade to Solo for 50 AI calls per month.' :
      plan === 'solo'   ? 'Upgrade to Pro for 150 AI calls per month.' :
      plan === 'pro'    ? 'Upgrade to Studio for 750 AI calls per month.' :
                          'Contact support if you need more.'
    return {
      allowed: false,
      reason: `You've used all ${limits.aiCallsPerMonth} AI calls this month on the ${plan} plan. ${upgradeMsg}`,
      remaining: 0,
      limit: limits.aiCallsPerMonth,
    }
  }

  return { allowed: true, remaining, limit: limits.aiCallsPerMonth }
}

export async function canSendByEmail(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (!limits.canSendByEmail) {
    return {
      allowed: false,
      reason: `Sending invoices by email requires the Solo plan or above. Upgrade to unlock email sending.`,
    }
  }
  return { allowed: true }
}

export async function canUseRecurring(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (!limits.canUseRecurring) {
    return {
      allowed: false,
      reason: 'Recurring invoices require the Pro plan or above.',
    }
  }
  return { allowed: true }
}
