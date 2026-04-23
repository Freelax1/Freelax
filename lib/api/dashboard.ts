// lib/api/dashboard.ts — v1.0
// Single batched query for the dashboard. No UI, no calculations.

import { createClient } from '@/lib/supabase/client'

export async function fetchDashboardData(userId: string, start: Date, end: Date) {
  const supabase = createClient()

  const lastYearStart = new Date(start); lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)
  const lastYearEnd   = new Date(end);   lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)
  const samePointLastYear = new Date(); samePointLastYear.setFullYear(samePointLastYear.getFullYear() - 1)

  const [
    { count: activeClients },
    { count: liveProjects },
    { data: unpaidInvoices },
    { data: ir35Projects },
    { data: recentInvoices },
    { data: paidInvoices },
    { data: expenses },
    { data: allInvoices },
    { data: lastYearInvoices },
    { data: lastYearExpenses },
    { data: upcomingInvoices },
    { data: expiringQuotes },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
    supabase.from('invoices').select('total,status').eq('user_id', userId).in('status', ['sent','overdue']),
    supabase.from('projects').select('id,title,ir35_status,clients(name)').eq('user_id', userId).eq('status', 'active'),
    supabase.from('invoices').select('id,invoice_number,status,total,due_date,clients(name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('total,vat_amount,paid_date').eq('user_id', userId).eq('status','paid').gte('paid_date', start.toISOString()).lte('paid_date', end.toISOString()),
    supabase.from('expenses').select('amount,category,date').eq('user_id', userId).gte('date', start.toISOString().slice(0,10)).lte('date', end.toISOString().slice(0,10)),
    supabase.from('invoices').select('total,vat_amount,status,issue_date,paid_date').eq('user_id', userId).gte('issue_date', start.toISOString().slice(0,10)),
    supabase.from('invoices').select('total,vat_amount,paid_date').eq('user_id', userId).eq('status','paid').gte('paid_date', lastYearStart.toISOString()).lte('paid_date', samePointLastYear.toISOString()),
    supabase.from('expenses').select('amount').eq('user_id', userId).gte('date', lastYearStart.toISOString().slice(0,10)).lte('date', samePointLastYear.toISOString().slice(0,10)),
    supabase.from('invoices').select('id,invoice_number,status,total,due_date,clients(name)').eq('user_id', userId).in('status',['sent','overdue']).order('due_date', { ascending: true }).limit(10),
    supabase.from('quotes').select('id,quote_number,expiry_date,clients(name)').eq('user_id', userId).eq('status','sent').order('expiry_date', { ascending: true }).limit(5),
  ])

  return {
    activeClients:  activeClients  ?? 0,
    liveProjects:   liveProjects   ?? 0,
    unpaidInvoices: unpaidInvoices ?? [],
    ir35Projects:   ir35Projects   ?? [],
    recentInvoices: recentInvoices ?? [],
    paidInvoices:   paidInvoices   ?? [],
    expenses:       expenses       ?? [],
    allInvoices:      allInvoices      ?? [],
    lastYearInvoices: lastYearInvoices ?? [],
    lastYearExpenses: lastYearExpenses ?? [],
    upcomingInvoices: upcomingInvoices ?? [],
    expiringQuotes:   expiringQuotes   ?? [],
  }
}
