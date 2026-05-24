// lib/api/projects.ts — v1.0
// All Supabase queries for projects. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'
import type { IR35Answer, IR35Status } from '@/types/database'

export type ProjectListRow = {
  id: string
  title: string
  status: string
  rate_type: string | null
  rate_amount: number | null
  end_date: string | null
  ir35_status: IR35Status | null
  client_id: string | null
  clients: { id: string; name: string } | null
}

export async function fetchProjects(): Promise<ProjectListRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, status, rate_type, rate_amount, end_date, ir35_status, client_id, clients(id, name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ProjectListRow[]
}

export async function fetchProjectById(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(name, id)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchProjectInvoices(projectId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, issue_date')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchProjectsForClient(clientId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, title')
    .eq('client_id', clientId)
    .eq('status', 'active')
  if (error) throw error
  return data ?? []
}

export async function createProject(payload: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function saveIR35Assessment(
  projectId: string,
  answers: IR35Answer[],
  status: IR35Status,
) {
  return updateProject(projectId, {
    ir35_answers: answers,
    ir35_status: status,
    ir35_assessed_at: new Date().toISOString(),
  })
}

export async function deleteProject(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
