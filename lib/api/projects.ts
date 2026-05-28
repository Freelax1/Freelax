// lib/api/projects.ts — v1.0
// All Supabase queries for projects. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'
import { Events } from '@/lib/posthog-events'
import { track } from '@/lib/posthog-track'
import type { IR35Answer, IR35Status } from '@/types/database'

export async function fetchProjects() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, status, rate_type, rate_amount, end_date, ir35_status, client_id, clients(id, name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
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
  track(String(payload.user_id), Events.PROJECT_CREATED, { project_id: data.id })
  return data
}

export async function updateProject(id: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  if (payload.user_id) track(String(payload.user_id), Events.PROJECT_UPDATED, { project_id: id })
}

export async function saveIR35Assessment(
  projectId: string,
  answers: IR35Answer[],
  status: IR35Status,
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await updateProject(projectId, {
    ir35_answers: answers,
    ir35_status: status,
    ir35_assessed_at: new Date().toISOString(),
  })
  if (user) track(user.id, Events.IR35_ASSESSMENT_SAVED, { project_id: projectId, ir35_status: status })
}

export async function deleteProject(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  if (user) track(user.id, Events.PROJECT_DELETED, { project_id: id })
}
