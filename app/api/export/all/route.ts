// GDPR data export — returns a ZIP containing one CSV per data type.
// Covers all user data across all time (not just current tax year).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

function escape(val: unknown): string {
  const s = String(val ?? '')
  const e = s.replace(/"/g, '""')
  return /^[=+\-@]/.test(e) ? `"\t${e}"` : `"${e}"`
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows]
    .map(row => row.map(escape).join(','))
    .join('\n')
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {

  // Fetch all data in parallel — RLS ensures each query returns only the user's own data
  const [
    { data: invoices },
    { data: quotes },
    { data: expenses },
    { data: clients },
    { data: projects },
    { data: mileage },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('invoice_number, status, issue_date, due_date, paid_date, total, vat_amount, notes, clients(name), invoice_line_items(description, quantity, unit_price, vat_rate)')
      .eq('user_id', user.id)
      .order('issue_date', { ascending: false }),
    supabase
      .from('quotes')
      .select('quote_number, status, issue_date, expiry_date, total, vat_amount, notes, clients(name), quote_line_items(description, quantity, unit_price, vat_rate)')
      .eq('user_id', user.id)
      .order('issue_date', { ascending: false }),
    supabase
      .from('expenses')
      .select('date, merchant, description, category, amount, vat_amount, vat_reclaimable')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
    supabase
      .from('clients')
      .select('name, contact_name, email, phone, address_line1, address_line2, city, postcode, country, notes')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('projects')
      .select('title, status, ir35_status, rate_type, rate_amount, start_date, end_date, description, clients(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('mileage_entries')
      .select('date, description, from_location, to_location, miles, purpose, tax_year_start')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
    supabase
      .from('users')
      .select('full_name, email, business_name, business_type, utr_number, vat_number, vat_registered, address_line1, address_line2, city, postcode, phone, created_at')
      .eq('id', user.id)
      .single(),
  ])

  const zip  = new JSZip()
  const date = new Date().toISOString().slice(0, 10)

  // ── invoices.csv ──────────────────────────────────────────────────────────
  zip.file('invoices.csv', buildCsv(
    ['Invoice Number', 'Client', 'Status', 'Issue Date', 'Due Date', 'Paid Date', 'Subtotal (£)', 'VAT (£)', 'Total (£)', 'Notes'],
    (invoices ?? []).map((i: any) => [
      i.invoice_number,
      (i.clients as any)?.name ?? '',
      i.status,
      i.issue_date ?? '',
      i.due_date   ?? '',
      i.paid_date  ?? '',
      (Number(i.total) - Number(i.vat_amount ?? 0)).toFixed(2),
      Number(i.vat_amount ?? 0).toFixed(2),
      Number(i.total).toFixed(2),
      i.notes ?? '',
    ])
  ))

  // ── invoice_line_items.csv ────────────────────────────────────────────────
  const invoiceLineRows: unknown[][] = []
  for (const inv of invoices ?? []) {
    for (const li of (inv as any).invoice_line_items ?? []) {
      invoiceLineRows.push([
        (inv as any).invoice_number,
        li.description,
        li.quantity,
        Number(li.unit_price).toFixed(2),
        li.vat_rate ?? 0,
        (Number(li.quantity) * Number(li.unit_price)).toFixed(2),
      ])
    }
  }
  zip.file('invoice_line_items.csv', buildCsv(
    ['Invoice Number', 'Description', 'Quantity', 'Unit Price (£)', 'VAT Rate (%)', 'Line Total (£)'],
    invoiceLineRows
  ))

  // ── quotes.csv ────────────────────────────────────────────────────────────
  zip.file('quotes.csv', buildCsv(
    ['Quote Number', 'Client', 'Status', 'Issue Date', 'Expiry Date', 'Subtotal (£)', 'VAT (£)', 'Total (£)', 'Notes'],
    (quotes ?? []).map((q: any) => [
      q.quote_number,
      (q.clients as any)?.name ?? '',
      q.status,
      q.issue_date   ?? '',
      q.expiry_date  ?? '',
      (Number(q.total) - Number(q.vat_amount ?? 0)).toFixed(2),
      Number(q.vat_amount ?? 0).toFixed(2),
      Number(q.total).toFixed(2),
      q.notes ?? '',
    ])
  ))

  // ── quote_line_items.csv ──────────────────────────────────────────────────
  const quoteLineRows: unknown[][] = []
  for (const quo of quotes ?? []) {
    for (const li of (quo as any).quote_line_items ?? []) {
      quoteLineRows.push([
        (quo as any).quote_number,
        li.description,
        li.quantity,
        Number(li.unit_price).toFixed(2),
        li.vat_rate ?? 0,
        (Number(li.quantity) * Number(li.unit_price)).toFixed(2),
      ])
    }
  }
  zip.file('quote_line_items.csv', buildCsv(
    ['Quote Number', 'Description', 'Quantity', 'Unit Price (£)', 'VAT Rate (%)', 'Line Total (£)'],
    quoteLineRows
  ))

  // ── expenses.csv ──────────────────────────────────────────────────────────
  zip.file('expenses.csv', buildCsv(
    ['Date', 'Merchant', 'Description', 'Category', 'Amount (£)', 'VAT (£)', 'VAT Reclaimable'],
    (expenses ?? []).map((e: any) => [
      e.date,
      e.merchant    ?? '',
      e.description ?? '',
      (e.category   ?? '').replace(/_/g, ' '),
      Number(e.amount).toFixed(2),
      Number(e.vat_amount ?? 0).toFixed(2),
      e.vat_reclaimable ? 'Yes' : 'No',
    ])
  ))

  // ── clients.csv ───────────────────────────────────────────────────────────
  zip.file('clients.csv', buildCsv(
    ['Name', 'Contact Name', 'Email', 'Phone', 'Address Line 1', 'Address Line 2', 'City', 'Postcode', 'Country', 'Notes'],
    (clients ?? []).map((c: any) => [
      c.name,
      c.contact_name   ?? '',
      c.email          ?? '',
      c.phone          ?? '',
      c.address_line1  ?? '',
      c.address_line2  ?? '',
      c.city           ?? '',
      c.postcode       ?? '',
      c.country        ?? 'United Kingdom',
      c.notes          ?? '',
    ])
  ))

  // ── projects.csv ──────────────────────────────────────────────────────────
  zip.file('projects.csv', buildCsv(
    ['Title', 'Client', 'Status', 'IR35 Status', 'Rate Type', 'Rate Amount (£)', 'Start Date', 'End Date', 'Description'],
    (projects ?? []).map((p: any) => [
      p.title,
      (p.clients as any)?.name ?? '',
      p.status      ?? '',
      p.ir35_status ?? '',
      p.rate_type   ?? '',
      p.rate_amount ? Number(p.rate_amount).toFixed(2) : '',
      p.start_date  ?? '',
      p.end_date    ?? '',
      p.description ?? '',
    ])
  ))

  // ── mileage.csv ───────────────────────────────────────────────────────────
  zip.file('mileage.csv', buildCsv(
    ['Date', 'Description', 'From', 'To', 'Miles', 'HMRC Rate (p/mile)', 'Amount (£)', 'Purpose', 'Tax Year Start'],
    (mileage ?? []).map((m: any) => [
      m.date,
      m.description    ?? '',
      m.from_location  ?? '',
      m.to_location    ?? '',
      m.miles,
      45,
      ((Number(m.miles) * 45) / 100).toFixed(2),
      m.purpose        ?? '',
      m.tax_year_start ?? '',
    ])
  ))

  // ── profile.csv ───────────────────────────────────────────────────────────
  const pr = profile as any
  zip.file('profile.csv', buildCsv(
    ['Field', 'Value'],
    [
      ['Full Name',      pr?.full_name      ?? ''],
      ['Email',          pr?.email          ?? ''],
      ['Business Name',  pr?.business_name  ?? ''],
      ['Business Type',  pr?.business_type  ?? ''],
      ['UTR',            pr?.utr_number      ?? ''],
      ['VAT Registered', pr?.vat_registered  ? 'Yes' : 'No'],
      ['VAT Number',     pr?.vat_number      ?? ''],
      ['Address Line 1', pr?.address_line1  ?? ''],
      ['Address Line 2', pr?.address_line2  ?? ''],
      ['City',           pr?.city           ?? ''],
      ['Postcode',       pr?.postcode       ?? ''],
      ['Phone',          pr?.phone          ?? ''],
      ['Account Created', pr?.created_at ? pr.created_at.slice(0, 10) : ''],
    ]
  ))

  // ── README.txt ────────────────────────────────────────────────────────────
  zip.file('README.txt', [
    'FREELAX — PERSONAL DATA EXPORT',
    '================================',
    `Exported on:  ${date}`,
    `Account:      ${user.email}`,
    '',
    'This file contains all personal data held by Freelax (Britnova Limited)',
    'in accordance with your right to data portability under UK GDPR (Article 20).',
    '',
    'FILES IN THIS EXPORT',
    '--------------------',
    '  invoices.csv            All invoices (all time)',
    '  invoice_line_items.csv  Individual line items per invoice',
    '  quotes.csv              All quotes (all time)',
    '  quote_line_items.csv    Individual line items per quote',
    '  expenses.csv            All expenses (all time)',
    '  clients.csv             All clients',
    '  projects.csv            All projects',
    '  mileage.csv             All mileage entries',
    '  profile.csv             Your account and business details',
    '',
    'NOTES',
    '-----',
    '  All monetary values are in GBP (£).',
    '  All dates are in YYYY-MM-DD format.',
    '  Open any CSV in Excel or Google Sheets.',
    '',
    'QUESTIONS',
    '---------',
    '  Email: support@freelax.co.uk',
    '  Freelax is operated by Britnova Limited',
    '  89 Brassett Point, London, E15 3LB',
  ].join('\n'))

  const arrayBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
  const buffer = new Blob([arrayBuffer], { type: 'application/zip' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        buffer.type,
      'Content-Disposition': `attachment; filename="freelax-data-export-${date}.zip"`,
    },
  })
  } catch (err) {
    console.error('[export/all]', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
