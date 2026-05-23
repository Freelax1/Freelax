import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/tax-calculations'
import { logActivity } from '@/lib/api/invoice-activity'
import { canSendByEmail } from '@/lib/plan-limits'
import { generateInvoicePdfBuffer } from '@/lib/pdf/generate-invoice-pdf'
import { escapeHtml } from '@/lib/escape-html'
import { EMAIL_TEXT_SECONDARY, EMAIL_TEXT_BODY, EMAIL_TEXT_PRIMARY, EMAIL_BORDER_DEFAULT } from '@/lib/email-colours'
import type { Invoice } from '@/types/database'

function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template)
}

function applyTemplateHtml(template: string, vars: Record<string, string>): string {
  const safeVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, escapeHtml(v)])
  )
  return applyTemplate(template, safeVars)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const emailCheck = await canSendByEmail(user.id)
  if (!emailCheck.allowed) return NextResponse.json({ error: emailCheck.reason }, { status: 403 })

  const { invoiceId } = await req.json()

  const { data: invoiceData } = await supabase
    .from('invoices')
    .select('*, clients(*), users(*), invoice_line_items(*)')
    .eq('id', invoiceId)
    .single()
  const invoice = invoiceData as Invoice | null

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
  const client = invoice.clients
  const sender = invoice.users

  if (resendKey && client?.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      const businessName = sender?.business_name || sender?.full_name || 'Freelax User'
      const dueDate = new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      const clientName = client.contact_name || client.name

      const vars: Record<string, string> = {
        invoice_number: invoice.invoice_number,
        client_name:    clientName,
        total:          formatCurrency(invoice.total),
        due_date:       dueDate,
        business_name:  businessName,
      }

      const subjectTemplate = sender?.invoice_email_subject || 'Invoice {{invoice_number}} from {{business_name}}'
      const bodyTemplate    = sender?.invoice_email_body    || `Hi {{client_name}},\n\nPlease find invoice {{invoice_number}} for {{total}} attached.\n\nPayment is due by {{due_date}}.\n\nKind regards,\n{{business_name}}`

      const subject  = applyTemplate(subjectTemplate, vars)
      const bodyText = applyTemplateHtml(bodyTemplate, vars)

      // Generate PDF — if it fails we still send the email, just without attachment
      const pdfBuffer = await generateInvoicePdfBuffer(invoice)

      await resend.emails.send({
        from:     `Freelax <noreply@freelax.co.uk>`,
        reply_to: sender?.email || undefined,
        to: client.email,
        subject,
        attachments: pdfBuffer ? [{
          filename: `${invoice.invoice_number}.pdf`,
          content:  pdfBuffer,
        }] : [],
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:${EMAIL_TEXT_PRIMARY};">
            ${sender?.logo_url ? `<img src="${escapeHtml(sender.logo_url)}" alt="${escapeHtml(businessName)}" style="height:40px;object-fit:contain;margin-bottom:20px;display:block;" />` : ''}
            <h2 style="font-size:20px;margin-bottom:4px;">Invoice ${escapeHtml(invoice.invoice_number)}</h2>
            <p style="color:${EMAIL_TEXT_SECONDARY};font-size:13px;margin-bottom:20px;">${escapeHtml(businessName)}</p>
            <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:${EMAIL_TEXT_BODY};margin-bottom:8px;">${bodyText.replace(/\n/g, '<br/>')}</div>
            <table style="width:100%;border-collapse:collapse;margin:24px 0;">
              <tr><td style="padding:8px 0;border-bottom:1px solid ${EMAIL_BORDER_DEFAULT};color:${EMAIL_TEXT_SECONDARY};">Invoice</td><td style="padding:8px 0;border-bottom:1px solid ${EMAIL_BORDER_DEFAULT};font-weight:600;">${escapeHtml(invoice.invoice_number)}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid ${EMAIL_BORDER_DEFAULT};color:${EMAIL_TEXT_SECONDARY};">Amount</td><td style="padding:8px 0;border-bottom:1px solid ${EMAIL_BORDER_DEFAULT};font-weight:600;">${escapeHtml(formatCurrency(invoice.total))}</td></tr>
              <tr><td style="padding:8px 0;color:${EMAIL_TEXT_SECONDARY};">Due</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(dueDate)}</td></tr>
            </table>
            <p style="margin-top:24px;color:${EMAIL_TEXT_SECONDARY};font-size:13px;">${escapeHtml(businessName)}<br/>${escapeHtml(sender?.email || '')}</p>
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
