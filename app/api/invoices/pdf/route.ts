import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildInvoiceHtml } from '@/lib/pdf/generate-invoice-pdf'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const invoiceId = searchParams.get('id')
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), invoice_line_items(*), users(*), projects(title)')
    .eq('id', invoiceId)
    .single()

  if (!invoice || invoice.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const html = buildInvoiceHtml(invoice, true)
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}
