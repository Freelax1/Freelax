// app/api/invoices/recurring/route.ts
// Called daily by Vercel Cron (vercel.json) or Supabase scheduled function.
// Finds active templates due today or earlier and creates invoices from them.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function advanceDate(date: string, frequency: string): string {
  const d = new Date(date)
  if (frequency === 'weekly')    d.setDate(d.getDate() + 7)
  if (frequency === 'monthly')   d.setMonth(d.getMonth() + 1)
  if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: templates } = await supabase
    .from('invoice_templates')
    .select('*')
    .eq('active', true)
    .lte('next_run_date', today)

  if (!templates?.length) {
    return NextResponse.json({ created: 0 })
  }

  let created = 0
  for (const tmpl of templates) {
    // Atomically claim the next invoice number for this user.
    // next_invoice_number() uses SELECT … FOR UPDATE so concurrent cron
    // executions for the same user serialise rather than racing.
    const { data: invoiceNumber, error: numErr } = await supabase
      .rpc('next_invoice_number', { p_user_id: tmpl.user_id })
    if (numErr || !invoiceNumber) {
      console.error('recurring: failed to generate invoice number', numErr)
      continue
    }

    const dueDate = new Date(tmpl.next_run_date)
    dueDate.setDate(dueDate.getDate() + 30)

    const lineItems: any[] = tmpl.line_items ?? []
    const subtotal   = lineItems.reduce((s: number, l: any) => s + l.quantity * l.unit_price, 0)
    const vatAmount  = lineItems.reduce((s: number, l: any) => s + l.quantity * l.unit_price * (l.vat_rate / 100), 0)
    const total      = subtotal + vatAmount

    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        user_id:        tmpl.user_id,
        client_id:      tmpl.client_id,
        invoice_number: invoiceNumber,
        status:         'draft',
        issue_date:     tmpl.next_run_date,
        due_date:       dueDate.toISOString().slice(0, 10),
        payment_terms:  tmpl.payment_terms ?? 'Payment due within 30 days',
        notes:          tmpl.notes,
        subtotal, vat_amount: vatAmount, total,
      })
      .select()
      .single()

    if (invoice) {
      await supabase.from('invoice_line_items').insert(
        lineItems.map((l: any) => ({
          invoice_id:  invoice.id,
          description: l.description,
          quantity:    l.quantity,
          unit_price:  l.unit_price,
          vat_rate:    l.vat_rate,
          line_total:  l.quantity * l.unit_price,
        }))
      )
      created++
    }

    // Advance the next_run_date
    await supabase
      .from('invoice_templates')
      .update({ next_run_date: advanceDate(tmpl.next_run_date, tmpl.frequency) })
      .eq('id', tmpl.id)
  }

  return NextResponse.json({ created, processed: templates.length })
}
