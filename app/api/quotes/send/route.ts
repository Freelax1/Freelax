// app/api/quotes/send/route.ts — v2.0
// Sends a quote email using the user's saved template + client portal link

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/tax-calculations'
import { canSendByEmail } from '@/lib/plan-limits'
import { generateQuotePdfBuffer } from '@/lib/pdf/generate-invoice-pdf'
import { logQuoteActivity } from '@/lib/api/quote-activity'

function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { quoteId } = await req.json()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, clients(*), quote_line_items(*)')
    .eq('id', quoteId)
    .single()

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const emailCheck = await canSendByEmail(user.id)
  if (!emailCheck.allowed) return NextResponse.json({ error: emailCheck.reason }, { status: 403 })

  // Fetch sender profile separately (quotes.user_id → auth.users, not public users)
  const { data: senderProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', quote.user_id)
    .single()

  // Update status to sent
  await supabase.from('quotes').update({
    status:     'sent',
    sent_at:    new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', quoteId)

  let emailSent = false
  const resendKey = process.env.RESEND_API_KEY
  const client    = (quote as any).clients
  const sender    = senderProfile

  if (resendKey && client?.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)

      const businessName = sender?.business_name || sender?.full_name || 'Freelax User'
      const expiryDate   = new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      const clientName   = client.contact_name || client.name
      const portalLink   = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://freedesk.co.uk'}/q/${quote.public_token}`

      // Template variables
      const vars: Record<string, string> = {
        client_name:   clientName,
        quote_number:  quote.quote_number,
        total:         formatCurrency(quote.total),
        expiry_date:   expiryDate,
        business_name: businessName,
        quote_link:    portalLink,
      }

      // Use saved template or fall back to default
      const subjectTemplate = sender?.quote_email_subject || 'Quote {{quote_number}} from {{business_name}}'
      const bodyTemplate    = sender?.quote_email_body    || `Hi {{client_name}},\n\nPlease find your quote {{quote_number}} for {{total}}, valid until {{expiry_date}}.\n\nView your quote here: {{quote_link}}\n\nTo accept, please reply to this email or contact us directly.\n\nKind regards,\n{{business_name}}`

      const subject = applyTemplate(subjectTemplate, vars)
      const bodyText = applyTemplate(bodyTemplate, vars)

      // Build summary table for inline display
      const expiryFmt = new Date(quote.expiry_date).toLocaleDateString('en-GB')
      const summaryTable = `
        <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:40%;">Quote number</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${quote.quote_number}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Amount</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${formatCurrency(quote.total)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Valid until</td><td style="padding:8px 0;font-weight:600;">${expiryDate}</td></tr>
        </table>`

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
          ${sender?.logo_url ? `<img src="${sender.logo_url}" alt="${businessName}" style="height:40px;object-fit:contain;margin-bottom:20px;display:block;" />` : ''}
          <h2 style="font-size:20px;font-weight:700;margin-bottom:4px;">Quote ${quote.quote_number}</h2>
          <p style="color:#64748b;font-size:13px;margin-bottom:20px;">${businessName}</p>
          <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#334155;margin-bottom:8px;">${bodyText.replace(/\n/g, '<br/>')}</div>
          ${summaryTable}
          <div style="margin:28px 0;">
            <a href="${portalLink}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              View full quote →
            </a>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
            ${businessName}${sender?.email ? ` · ${sender.email}` : ''}
          </p>
        </div>`

      // Generate PDF attachment using quote template
      const pdfBuffer = await generateQuotePdfBuffer(
        { ...quote, clients: client },
        senderProfile
      ).catch(() => null)

      await resend.emails.send({
        from:    'Freelax <onboarding@resend.dev>',
        reply_to: sender?.email || undefined,
        to:      client.email,
        subject,
        html,
        ...(pdfBuffer ? { attachments: [{ filename: `${quote.quote_number}.pdf`, content: pdfBuffer }] } : {}),
      })
      emailSent = true
    } catch (e) {
      console.error('Quote email error:', e)
    }
  }

  await logQuoteActivity(supabase, quoteId, user.id, 'sent', {
    emailSent,
    clientEmail: client?.email ?? null,
    wasResend:   quote.status === 'sent',
  })

  return NextResponse.json({
    success: true,
    emailSent,
    message: emailSent
      ? `Quote sent to ${client?.email}`
      : client?.email
        ? 'Status updated to Sent. Add a Resend API key in .env.local to send emails.'
        : 'Status updated to Sent. Add client email address to send emails.',
  })
}
