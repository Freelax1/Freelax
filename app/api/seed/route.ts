import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  // ── Clean up existing seed data ───────────────────────────────────────
  const { data: existingInvoices } = await supabase.from('invoices').select('id').eq('user_id', uid)
  if (existingInvoices?.length) {
    await supabase.from('invoice_line_items').delete().in('invoice_id', existingInvoices.map(i => i.id))
  }
  const { data: existingQuotes } = await supabase.from('quotes').select('id').eq('user_id', uid)
  if (existingQuotes?.length) {
    await supabase.from('quote_line_items').delete().in('quote_id', existingQuotes.map(q => q.id))
  }
  await supabase.from('invoices').delete().eq('user_id', uid)
  await supabase.from('quotes').delete().eq('user_id', uid)
  await supabase.from('expenses').delete().eq('user_id', uid)
  await supabase.from('projects').delete().eq('user_id', uid)
  await supabase.from('clients').delete().eq('user_id', uid)

  // Get business_id
  const { data: biz } = await supabase
    .from('businesses').select('id').eq('user_id', uid).single()
  const bid = biz?.id ?? null

  // ── Clients ──────────────────────────────────────────────────────────
  const clientsData = [
    { user_id: uid, business_id: bid, name: 'Horizon Digital Ltd', contact_name: 'Rachel Townsend', email: 'rachel@horizondigital.co.uk', phone: '07911 234567', address_line1: '14 Canary Wharf', city: 'London', postcode: 'E14 5AB', status: 'active' },
    { user_id: uid, business_id: bid, name: 'Northgate Media', contact_name: 'James Okafor', email: 'james@northgatemedia.com', phone: '07823 456789', address_line1: '32 Deansgate', city: 'Manchester', postcode: 'M3 4LY', status: 'active' },
    { user_id: uid, business_id: bid, name: 'Clearfield Consulting', contact_name: 'Sophie Mackintosh', email: 'sophie@clearfieldco.co.uk', phone: '07734 567890', address_line1: '8 St Andrew Square', city: 'Edinburgh', postcode: 'EH2 2BD', status: 'active' },
    { user_id: uid, business_id: bid, name: 'Redwood Labs', contact_name: 'Tom Hargreaves', email: 'tom@redwoodlabs.io', phone: '07612 678901', address_line1: '23 Temple Row', city: 'Birmingham', postcode: 'B2 5LA', status: 'active' },
    { user_id: uid, business_id: bid, name: 'Pulsar Creative', contact_name: 'Amara Diallo', email: 'amara@pulsarcreative.co.uk', phone: '07541 789012', address_line1: '5 Park Row', city: 'Leeds', postcode: 'LS1 5HD', status: 'paused' },
    { user_id: uid, business_id: bid, name: 'Stonebridge Partners', contact_name: 'Oliver Webb', email: 'oliver@stonebridgepartners.com', phone: '07490 890123', address_line1: '77 Queen Street', city: 'Glasgow', postcode: 'G1 3BX', status: 'archived' },
  ]
  const { data: clients } = await supabase.from('clients').insert(clientsData).select('id, name')

  if (!clients?.length) return NextResponse.json({ error: 'Client insert failed' }, { status: 500 })

  const [horizon, northgate, clearfield, redwood, pulsar] = clients

  // ── Projects ──────────────────────────────────────────────────────────
  const projectsData = [
    { user_id: uid, business_id: bid, client_id: horizon.id, title: 'Platform Redesign', description: 'Full frontend overhaul of their customer portal', status: 'active', rate_type: 'daily', rate_amount: 650, start_date: '2026-02-01', ir35_status: 'outside' },
    { user_id: uid, business_id: bid, client_id: northgate.id, title: 'CMS Integration', description: 'Headless CMS setup with Next.js', status: 'active', rate_type: 'daily', rate_amount: 550, start_date: '2026-01-15', ir35_status: 'outside' },
    { user_id: uid, business_id: bid, client_id: clearfield.id, title: 'Data Dashboard MVP', description: 'Analytics dashboard for internal teams', status: 'completed', rate_type: 'fixed', rate_amount: 8500, start_date: '2025-10-01', end_date: '2025-12-20', ir35_status: 'outside' },
    { user_id: uid, business_id: bid, client_id: redwood.id, title: 'API Development', description: 'REST API for mobile app backend', status: 'active', rate_type: 'daily', rate_amount: 700, start_date: '2026-03-01', ir35_status: 'needs_review' },
    { user_id: uid, business_id: bid, client_id: pulsar.id, title: 'Brand Site Build', description: 'Marketing site with animations', status: 'on_hold', rate_type: 'fixed', rate_amount: 4200, start_date: '2026-01-20', ir35_status: 'outside' },
  ]
  const { data: projects } = await supabase.from('projects').insert(projectsData).select('id, title')

  if (!projects?.length) return NextResponse.json({ error: 'Project insert failed' }, { status: 500 })
  const [projHorizon, projNorthgate, projClearfield, projRedwood] = projects

  // ── Invoices ──────────────────────────────────────────────────────────
  const invoicesData = [
    { user_id: uid, business_id: bid, client_id: horizon.id,    project_id: projHorizon.id,   invoice_number: 'INV-2025-041', status: 'paid',      issue_date: '2025-11-01', due_date: '2025-11-30', paid_date: '2025-11-22', subtotal: 6500.00, vat_amount: 1300.00, total: 7800.00, payment_terms: 'Payment due within 30 days' },
    { user_id: uid, business_id: bid, client_id: northgate.id,  project_id: projNorthgate.id, invoice_number: 'INV-2025-042', status: 'paid',      issue_date: '2025-11-15', due_date: '2025-12-14', paid_date: '2025-12-10', subtotal: 2750.00, vat_amount: 550.00,  total: 3300.00, payment_terms: 'Payment due within 30 days' },
    { user_id: uid, business_id: bid, client_id: clearfield.id, project_id: projClearfield.id,invoice_number: 'INV-2025-043', status: 'paid',      issue_date: '2025-12-20', due_date: '2026-01-19', paid_date: '2026-01-15', subtotal: 8500.00, vat_amount: 1700.00, total: 10200.00, payment_terms: 'Payment due within 30 days' },
    { user_id: uid, business_id: bid, client_id: horizon.id,    project_id: projHorizon.id,   invoice_number: 'INV-2026-001', status: 'paid',      issue_date: '2026-01-31', due_date: '2026-03-01', paid_date: '2026-04-12', subtotal: 9750.00, vat_amount: 1950.00, total: 11700.00, payment_terms: 'Payment due within 30 days' },
    { user_id: uid, business_id: bid, client_id: northgate.id,  project_id: projNorthgate.id, invoice_number: 'INV-2026-002', status: 'overdue',   issue_date: '2026-02-01', due_date: '2026-03-02', subtotal: 3300.00, vat_amount: 660.00,  total: 3960.00, payment_terms: 'Payment due within 30 days' },
    { user_id: uid, business_id: bid, client_id: redwood.id,    project_id: projRedwood.id,   invoice_number: 'INV-2026-003', status: 'paid',      issue_date: '2026-03-31', due_date: '2026-04-30', paid_date: '2026-05-09', subtotal: 7000.00, vat_amount: 1400.00, total: 8400.00, payment_terms: 'Payment due within 30 days' },
    { user_id: uid, business_id: bid, client_id: horizon.id,    project_id: projHorizon.id,   invoice_number: 'INV-2026-004', status: 'draft',     issue_date: '2026-04-30', due_date: '2026-05-30', subtotal: 9750.00, vat_amount: 1950.00, total: 11700.00, payment_terms: 'Payment due within 30 days' },
    { user_id: uid, business_id: bid, client_id: clearfield.id, project_id: null,             invoice_number: 'INV-2026-005', status: 'draft',     issue_date: '2026-05-01', due_date: '2026-05-31', subtotal: 1800.00, vat_amount: 360.00,  total: 2160.00, payment_terms: 'Payment due within 30 days' },
  ]
  const { data: invoices, error: invErr } = await supabase.from('invoices').insert(invoicesData).select('id, invoice_number')
  if (!invoices?.length) return NextResponse.json({ error: 'Invoice insert failed', detail: invErr?.message, code: invErr?.code }, { status: 500 })

  // ── Invoice line items ────────────────────────────────────────────────
  const lineItems = [
    { invoice_id: invoices[0].id, description: 'Frontend development — October 2025 (10 days)', quantity: 10, unit_price: 650, vat_rate: 20, line_total: 6500 },
    { invoice_id: invoices[1].id, description: 'CMS integration & headless setup (5 days)', quantity: 5, unit_price: 550, vat_rate: 20, line_total: 2750 },
    { invoice_id: invoices[2].id, description: 'Data dashboard MVP — fixed-price project', quantity: 1, unit_price: 8500, vat_rate: 20, line_total: 8500 },
    { invoice_id: invoices[3].id, description: 'Frontend development — January 2026 (15 days)', quantity: 15, unit_price: 650, vat_rate: 20, line_total: 9750 },
    { invoice_id: invoices[4].id, description: 'CMS integration — Phase 2 (6 days)', quantity: 6, unit_price: 550, vat_rate: 20, line_total: 3300 },
    { invoice_id: invoices[5].id, description: 'API development — March 2026 (10 days)', quantity: 10, unit_price: 700, vat_rate: 20, line_total: 7000 },
    { invoice_id: invoices[6].id, description: 'Frontend development — April 2026 (15 days)', quantity: 15, unit_price: 650, vat_rate: 20, line_total: 9750 },
    { invoice_id: invoices[7].id, description: 'Consulting session — strategy review', quantity: 3, unit_price: 600, vat_rate: 20, line_total: 1800 },
  ]
  await supabase.from('invoice_line_items').insert(lineItems)

  // ── Expenses ──────────────────────────────────────────────────────────
  const expensesData = [
    { user_id: uid, business_id: bid, date: '2026-01-08', merchant: 'British Rail', description: 'London–Manchester client visit', category: 'travel', amount: 87.50, vat_amount: 0, vat_reclaimable: false },
    { user_id: uid, business_id: bid, date: '2026-01-14', merchant: 'AWS', description: 'Cloud hosting — January', category: 'software', amount: 43.20, vat_amount: 7.20, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-01-20', merchant: 'Figma', description: 'Figma Professional plan', category: 'software', amount: 15.00, vat_amount: 3.00, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-02-03', merchant: 'The Workspace', description: 'Hot desk — February', category: 'office', amount: 120.00, vat_amount: 24.00, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-02-10', merchant: 'EasyJet', description: 'Edinburgh client meeting', category: 'travel', amount: 64.99, vat_amount: 0, vat_reclaimable: false },
    { user_id: uid, business_id: bid, date: '2026-02-14', merchant: 'Apple', description: 'Magic Keyboard replacement', category: 'equipment', amount: 99.00, vat_amount: 16.50, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-02-18', merchant: 'GitHub', description: 'GitHub Pro subscription', category: 'software', amount: 4.00, vat_amount: 0.80, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-03-05', merchant: 'Pret A Manger', description: 'Client lunch meeting', category: 'meals', amount: 38.40, vat_amount: 6.40, vat_reclaimable: false },
    { user_id: uid, business_id: bid, date: '2026-03-12', merchant: 'TfL', description: 'Monthly travel card', category: 'travel', amount: 203.80, vat_amount: 0, vat_reclaimable: false },
    { user_id: uid, business_id: bid, date: '2026-03-18', merchant: 'Vercel', description: 'Pro plan — March', category: 'software', amount: 20.00, vat_amount: 4.00, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-03-22', merchant: 'O\'Reilly', description: 'Technical book subscription', category: 'training', amount: 49.00, vat_amount: 9.80, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-04-02', merchant: 'HMRC', description: 'Self assessment — payment on account', category: 'tax', amount: 3240.00, vat_amount: 0, vat_reclaimable: false },
    { user_id: uid, business_id: bid, date: '2026-04-07', merchant: 'The Workspace', description: 'Hot desk — April', category: 'office', amount: 120.00, vat_amount: 24.00, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-04-15', merchant: 'Slack', description: 'Slack Pro — monthly', category: 'software', amount: 7.50, vat_amount: 1.50, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-05-01', merchant: 'Adobe', description: 'Creative Cloud subscription', category: 'software', amount: 54.98, vat_amount: 9.16, vat_reclaimable: true },
    { user_id: uid, business_id: bid, date: '2026-05-08', merchant: 'National Express', description: 'Birmingham site visit', category: 'travel', amount: 32.00, vat_amount: 0, vat_reclaimable: false },
  ]
  await supabase.from('expenses').insert(expensesData)

  // ── Quotes ────────────────────────────────────────────────────────────
  const quotesData = [
    { user_id: uid, client_id: horizon.id,  project_id: projHorizon.id,  quote_number: 'QUO-2026-001', status: 'accepted', issue_date: '2026-01-10', expiry_date: '2026-02-10', subtotal: 19500, vat_amount: 3900, total: 23400, notes: 'Platform redesign — 30 day sprint' },
    { user_id: uid, client_id: redwood.id,  project_id: projRedwood.id,  quote_number: 'QUO-2026-002', status: 'sent',     issue_date: '2026-04-01', expiry_date: '2026-05-01', subtotal: 14000, vat_amount: 2800, total: 16800, notes: 'API development phase 2' },
    { user_id: uid, client_id: pulsar?.id,  project_id: null,            quote_number: 'QUO-2026-003', status: 'draft',    issue_date: '2026-05-01', expiry_date: '2026-06-01', subtotal: 6500,  vat_amount: 1300, total: 7800,  notes: 'Brand refresh — discovery + design' },
  ]
  const { data: quotesInserted, error: quotesErr } = await supabase.from('quotes').insert(quotesData).select('id')
  if (quotesErr) console.error('QUOTES_ERR:', quotesErr.message, quotesErr.code)

  if (quotesInserted?.length) {
    await supabase.from('quote_line_items').insert([
      { quote_id: quotesInserted[0].id, description: 'Frontend development — 30 days @ £650/day', quantity: 30, unit_price: 650, vat_rate: 20, line_total: 19500 },
      { quote_id: quotesInserted[1].id, description: 'API development phase 2 — 20 days @ £700/day', quantity: 20, unit_price: 700, vat_rate: 20, line_total: 14000 },
      { quote_id: quotesInserted[2].id, description: 'Discovery & design — fixed fee', quantity: 1, unit_price: 6500, vat_rate: 20, line_total: 6500 },
    ])
  }

  return NextResponse.json({
    ok: true,
    inserted: {
      clients: clients.length,
      projects: projects.length,
      invoices: invoices.length,
      expenses: expensesData.length,
      quotes: quotesInserted?.length ?? 0,
    }
  })
}
