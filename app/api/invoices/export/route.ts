import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTaxYear } from '@/lib/tax-calculations'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

function safeCsvCell(raw: unknown): string {
  const cell = String(raw)
  const escaped = cell.replace(/"/g, '""')
  // Prefix formula-injection characters so spreadsheet apps treat the cell as text
  return /^[=+@-]/.test(escaped) ? `\t${escaped}` : escaped
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'income' // 'income' | 'expenses' | 'full'
  const { start, end, label } = getCurrentTaxYear()
  await trackServer(user.id, Events.INVOICE_EXPORTED, { export_type: type })

  if (type === 'income') {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_number, paid_date, total, vat_amount, clients(name)')
      .eq('status', 'paid')
      .eq('user_id', user.id)
      .gte('paid_date', start.toISOString())
      .lte('paid_date', end.toISOString())
      .order('paid_date', { ascending: false })

    const rows = [
      ['Invoice #', 'Client', 'Paid Date', 'Ex-VAT (£)', 'VAT (£)', 'Total (£)'],
      ...(invoices ?? []).map((i: any) => [
        i.invoice_number,
        i.clients?.name ?? '',
        i.paid_date,
        (Number(i.total) - Number(i.vat_amount)).toFixed(2),
        Number(i.vat_amount).toFixed(2),
        Number(i.total).toFixed(2),
      ]),
    ]

    const csv = rows.map(r => r.map(cell => `"${safeCsvCell(cell)}"`).join(',')).join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="freelax-income-${label.replace('/', '-')}.csv"`,
      },
    })
  }

  if (type === 'expenses') {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('date, merchant, description, category, amount, vat_amount, vat_reclaimable')
      .eq('user_id', user.id)
      .gte('date', start.toISOString().slice(0, 10))
      .lte('date', end.toISOString().slice(0, 10))
      .order('date', { ascending: false })

    const rows = [
      ['Date', 'Merchant', 'Description', 'Category', 'Amount (£)', 'VAT (£)', 'VAT Reclaimable'],
      ...(expenses ?? []).map((e: any) => [
        e.date,
        e.merchant,
        e.description ?? '',
        e.category.replace(/_/g, ' '),
        Number(e.amount).toFixed(2),
        Number(e.vat_amount).toFixed(2),
        e.vat_reclaimable ? 'Yes' : 'No',
      ]),
    ]

    const csv = rows.map(r => r.map(cell => `"${safeCsvCell(cell)}"`).join(',')).join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="freelax-expenses-${label.replace('/', '-')}.csv"`,
      },
    })
  }

  // type === 'full' — combined P&L export
  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('invoice_number, paid_date, total, vat_amount, clients(name)')
      .eq('status', 'paid')
      .eq('user_id', user.id)
      .gte('paid_date', start.toISOString())
      .lte('paid_date', end.toISOString())
      .order('paid_date', { ascending: false }),
    supabase
      .from('expenses')
      .select('date, merchant, category, amount')
      .eq('user_id', user.id)
      .gte('date', start.toISOString().slice(0, 10))
      .lte('date', end.toISOString().slice(0, 10))
      .order('date', { ascending: false }),
  ])

  const incomeRows = (invoices ?? []).map((i: any) => [
    i.paid_date,
    'Income',
    i.clients?.name ?? '',
    i.invoice_number,
    (Number(i.total) - Number(i.vat_amount)).toFixed(2),
    '',
  ])
  const expenseRows = (expenses ?? []).map((e: any) => [
    e.date,
    'Expense',
    e.merchant,
    e.category.replace(/_/g, ' '),
    '',
    Number(e.amount).toFixed(2),
  ])

  const allRows = [
    ['Date', 'Type', 'Name', 'Reference', 'Income (£)', 'Expense (£)'],
    ...[...incomeRows, ...expenseRows].sort((a, b) => String(b[0]).localeCompare(String(a[0]))),
  ]

  const csv = allRows.map(r => r.map(cell => `"${safeCsvCell(cell)}"`).join(',')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="freelax-full-${label.replace('/', '-')}.csv"`,
    },
  })
}
