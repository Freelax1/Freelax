// lib/api/quotes.ts — v1.0
// All Supabase queries for quotes. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'

export async function fetchQuotes() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_number, status, issue_date, expiry_date, total, clients(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchQuoteById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('*, clients(*), projects(title), quote_line_items(*)')
    .eq('id', id)
    .single()
  if (error) throw error

  // Fetch sender profile separately (same pattern as invoices)
  if (data) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user_id)
      .single()
    return { ...data, users: userData }
  }
  return data
}

export async function fetchQuoteCount(userId: string): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

export async function createQuote(payload: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('quotes')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateQuote(id: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('quotes')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function createQuoteLineItems(items: Record<string, unknown>[]) {
  const supabase = createClient()
  const { error } = await supabase.from('quote_line_items').insert(items)
  if (error) throw error
}

export async function deleteQuoteLineItems(quoteId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('quote_line_items')
    .delete()
    .eq('quote_id', quoteId)
  if (error) throw error
}


export async function fetchQuoteWithLineItems(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('*, quote_line_items(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchMaxQuoteNumber(userId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (!data?.quote_number) return 0
  const match = data.quote_number.match(/\d+$/)
  return match ? parseInt(match[0], 10) : 0
}

export async function deleteQuote(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
}
