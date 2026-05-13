import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildInvoiceHtml } from '@/lib/pdf/generate-invoice-pdf'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const invoiceId = searchParams.get('id')
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), invoice_line_items(*), users(business_name, full_name, email, phone, logo_url, address_line1, address_line2, city, postcode, bank_account_name, bank_sort_code, bank_account_number, bank_reference_note), projects(title)')
    .eq('id', invoiceId)
    .single()

  if (!invoice || invoice.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const html = buildInvoiceHtml(invoice, true)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}
