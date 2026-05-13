// app/api/plan/check/route.ts
// Checks if the current user can perform an action based on their plan.
// Called from the frontend before creating invoices, clients, expenses, or using AI.
//
// Usage:
//   const res = await fetch('/api/plan/check', {
//     method: 'POST',
//     body: JSON.stringify({ resource: 'invoice' })
//   })
//   const { allowed, reason } = await res.json()

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canCreateInvoice,
  canCreateClient,
  canCreateExpense,
  canUseAI,
  canSendByEmail,
  canUseRecurring,
  getUserPlan,
  getLimits,
} from '@/lib/plan-limits'

type Resource = 'invoice' | 'client' | 'expense' | 'ai' | 'email' | 'recurring'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { resource } = await req.json() as { resource: Resource }

  let result: { allowed: boolean; reason?: string }

  switch (resource) {
    case 'invoice':
      result = await canCreateInvoice(user.id)
      break
    case 'client':
      result = await canCreateClient(user.id)
      break
    case 'expense':
      result = await canCreateExpense(user.id)
      break
    case 'ai':
      result = await canUseAI(user.id)
      break
    case 'email':
      result = await canSendByEmail(user.id)
      break
    case 'recurring':
      result = await canUseRecurring(user.id)
      break
    default:
      result = { allowed: true }
  }

  return NextResponse.json(result)
}

// GET — returns the user's full plan summary (current usage + limits)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const plan = await getUserPlan(user.id)
  const limits = getLimits(plan)

  // Count current usage
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    { count: invoicesThisMonth },
    { count: clientsTotal },
    { count: expensesThisMonth },
  ] = await Promise.all([
    supabase.from('invoices').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('expenses').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
  ])

  return NextResponse.json({
    plan,
    limits,
    usage: {
      invoicesThisMonth: invoicesThisMonth ?? 0,
      clientsTotal: clientsTotal ?? 0,
      expensesThisMonth: expensesThisMonth ?? 0,
    },
  })
}
