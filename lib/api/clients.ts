// lib/api/clients.ts — v1.0
// All Supabase queries for clients. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'

export async function fetchClients() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*, invoices(total, status)')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchClientById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchClientProjects(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, status, ir35_status, rate_type, rate_amount')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchClientInvoices(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, issue_date, due_date')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchClientsForDropdown() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, status')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createClientRecord(payload: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('clients').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateClientRecord(id: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase.from('clients').update(payload).eq('id', id)
  if (error) throw error
}
