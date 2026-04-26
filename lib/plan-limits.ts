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
  invoicesPerMonth:  number   // -1 = unlimited
  clientsTotal:      number   // -1 = unlimited
  expensesPerMonth:  number   // -1 = unlimited
  aiCallsPerMonth:   number   // -1 = unlimited
  canSendByEmail:    boolean
  canUseStripe:      boolean
  canUseRecurring:   boolean
  canInviteAccountant: boolean
  seats:             number
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    invoicesPerMonth:    10,
    clientsTotal:        1,
    expensesPerMonth:    20,
    aiCallsPerMonth:     0,   // AI blocked on free
    canSendByEmail:      false,
    canUseStripe:        false,
    canUseRecurring:     false,
    canInviteAccountant: false,
    seats:               1,
  },
  solo: {
    invoicesPerMonth:    10,
    clientsTotal:        3,
    expensesPerMonth:    20,
    aiCallsPerMonth:     10,
    canSendByEmail:      false,
    canUseStripe:        false,
    canUseRecurring:     false,
    canInviteAccountant: false,
    seats:               1,
  },
  pro: {
    invoicesPerMonth:    -1,
    clientsTotal:        -1,
    expensesPerMonth:    -1,
    aiCallsPerMonth:     100,
    canSendByEmail:      true,
    canUseStripe:        true,
    canUseRecurring:     true,
    canInviteAccountant: true,
    seats:               1,
  },
  studio: {
    invoicesPerMonth:    -1,
    clientsTotal:        -1,
    expensesPerMonth:    -1,
    aiCallsPerMonth:     500,
    canSendByEmail:      true,
    canUseStripe:        true,
    canUseRecurring:     true,
    canInviteAccountant: true,
    seats:               3,
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

export async function canUseAI(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (limits.aiCallsPerMonth === 0) {
    return {
      allowed: false,
      reason: 'AI features are not available on the free plan. Upgrade to Solo or Pro to access AI.',
    }
  }

  if (limits.aiCallsPerMonth === -1) return { allowed: true }

  // For Pro/Solo — count AI calls this month
  // We use a simple approximation: count invoice_activity entries with action='ai_%'
  // or fall through and allow (full usage tracking requires a dedicated table)
  // For now: Solo (10 calls) we enforce, Pro/Studio we allow freely
  if (plan === 'solo') {
    const supabase = createClient()
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('invoice_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .like('action', 'ai_%')
      .gte('created_at', monthStart.toISOString())

    if ((count ?? 0) >= limits.aiCallsPerMonth) {
      return {
        allowed: false,
        reason: `You've used all ${limits.aiCallsPerMonth} AI calls this month on the Solo plan. Upgrade to Pro for 100 calls per month.`,
      }
    }
  }

  return { allowed: true }
}

export async function canSendByEmail(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getUserPlan(userId)
  const limits = getLimits(plan)

  if (!limits.canSendByEmail) {
    return {
      allowed: false,
      reason: `Sending invoices by email requires the Pro plan or above. Upgrade to unlock email sending.`,
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
