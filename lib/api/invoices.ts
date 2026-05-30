// lib/api/invoices.ts — v1.0
// All Supabase queries for invoices. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'
import { Events } from '@/lib/posthog-events'
import { track } from '@/lib/posthog-track'

export async function fetchInvoices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, issue_date, due_date, total, clients(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchInvoiceById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(*), projects(title), invoice_line_items(*), users(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchInvoiceWithLineItems(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchPaidInvoicesByUser(userId: string, start: Date, end: Date) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, vat_amount, paid_date, clients(name)')
    .eq('status', 'paid')
    .eq('user_id', userId)
    .gte('paid_date', start.toISOString())
    .lte('paid_date', end.toISOString())
    .order('paid_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchMaxInvoiceNumber(userId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', userId)
    .order('invoice_number', { ascending: false })
    .limit(1)
  if (!data?.length) return 0
  const match = data[0].invoice_number.match(/\d+$/)
  return match ? parseInt(match[0], 10) : 0
}

export async function createInvoice(payload: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  track(String(payload.user_id), Events.INVOICE_CREATED, { invoice_id: data.id })
  return data
}

export async function updateInvoice(id: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('invoices')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  if (payload.user_id) track(String(payload.user_id), Events.INVOICE_UPDATED, { invoice_id: id })
}

export async function createInvoiceLineItems(items: Record<string, unknown>[]) {
  const supabase = createClient()
  const { error } = await supabase.from('invoice_line_items').insert(items)
  if (error) throw error
}

export async function deleteInvoiceLineItems(invoiceId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', invoiceId)
  if (error) throw error
}

export async function deleteInvoice(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await deleteInvoiceLineItems(id)
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
  if (user) track(user.id, Events.INVOICE_DELETED, { invoice_id: id })
}
