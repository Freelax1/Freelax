// lib/api/expenses.ts — v1.0
// All Supabase queries for expenses. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'

export async function fetchExpenses(start: Date, end: Date) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', start.toISOString().slice(0, 10))
    .lte('date', end.toISOString().slice(0, 10))
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchExpensesByUser(userId: string, start: Date, end: Date) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, vat_amount, vat_reclaimable, date')
    .eq('user_id', userId)
    .gte('date', start.toISOString().slice(0, 10))
    .lte('date', end.toISOString().slice(0, 10))
  if (error) throw error
  return data ?? []
}

export async function createExpense(payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').insert(payload)
  if (error) throw error
}

export async function updateExpense(id: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').update(payload).eq('id', id)
  if (error) throw error
}

export async function uploadReceipt(userId: string, file: File): Promise<string | null> {
  const supabase = createClient()
  const ext  = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const { data: uploaded } = await supabase.storage.from('receipts').upload(path, file)
  if (!uploaded) return null
  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
  return publicUrl
}

export async function deleteExpense(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
