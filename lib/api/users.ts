// lib/api/users.ts — v1.0
// All Supabase queries for user/profile data. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'

export async function fetchCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function fetchUserProfile(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('business_type, student_loan_plan, pension_contributions, salary_drawn, dividends_drawn, vat_registered, monthly_expenses_estimate, monthly_personal_outgoings, other_income, investment_dividends')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('users')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

export async function fetchUserDefaults(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('invoice_prefix, invoice_default_notes, invoice_email_subject, invoice_email_body, quote_prefix, quote_validity_days, quote_default_notes, quote_email_subject, quote_email_body')
    .eq('id', userId)
    .single()
  return data
}
