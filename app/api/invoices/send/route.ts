import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/tax-calculations'
import { logActivity } from '@/lib/api/invoice-activity'
import { canSendByEmail } from '@/lib/plan-limits'
import { generateInvoicePdfBuffer } from '@/lib/pdf/generate-invoice-pdf'
import { escapeHtml } from '@/lib/escape-html'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const emailCheck = await canSendByEmail(user.id)
  if (!emailCheck.allowed) return NextResponse.json({ error: emailCheck.reason }, { status: 403 })

  const { invoiceId } = await req.json()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), users(*), invoice_line_items(*)')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Always update status to sent first — regardless of email
  await supabase.from('invoices').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', invoiceId)

  // Try to send email if Resend key exists
  let emailSent = false
  const resendKey = process.env.RESEND_API_KEY
  const client = (invoice as any).clients
  const sender = (invoice as any).users

  if (resendKey && client?.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      const businessName = sender?.business_name || sender?.full_name || 'Freelax User'
      const dueDate = new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

      // Generate PDF — if it fails we still send the email, just without attachment
      const pdfBuffer = await generateInvoicePdfBuffer(invoice)

      await resend.emails.send({
        from:     `Freelax <noreply@freelax.co.uk>`,
        reply_to: sender?.email || undefined,
        to: client.email,
        subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
        attachments: pdfBuffer ? [{
          filename: `${invoice.invoice_number}.pdf`,
          content:  pdfBuffer,
        }] : [],
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b;">
            <h2 style="font-size:20px;margin-bottom:8px;">Invoice ${escapeHtml(invoice.invoice_number)}</h2>
            <p style="color:#64748b;">Hi ${escapeHtml(client.contact_name || client.name)},</p>
            <p>Please find your invoice attached to this email.</p>
            <table style="width:100%;border-collapse:collapse;margin:24px 0;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Invoice</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(invoice.invoice_number)}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Amount</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(formatCurrency(invoice.total))}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;">Due</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(dueDate)}</td></tr>
            </table>
            <p style="margin-top:24px;color:#64748b;font-size:14px;">${escapeHtml(businessName)}<br/>${escapeHtml(sender?.email || '')}</p>
          </div>
        `,
      })
      emailSent = true
    } catch (e) {
      console.error('Email send error:', e)
    }
  }

  await logActivity(supabase, invoiceId, user.id, 'sent', {
    emailSent,
    clientEmail: client?.email ?? null,
  })

  return NextResponse.json({
    success: true,
    emailSent,
    message: emailSent
      ? `Invoice sent to ${client?.email}`
      : client?.email
        ? 'Status updated to Sent. Add a Resend API key in .env.local to send emails.'
        : 'Status updated to Sent. Add client email address to send emails.',
  })
}
