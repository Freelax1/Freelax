import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/tax-calculations'
import { logActivity } from '@/lib/api/invoice-activity'
import { escapeHtml } from '@/lib/escape-html'

const COOLDOWN_DAYS = 7
const TIER_MIN_PRIOR_CHASES: Record<'friendly' | 'formal' | 'legal', number> = {
  friendly: 0,
  formal:   1,
  legal:    2,
}
const VALID_TIERS = ['friendly', 'formal', 'legal'] as const
type Tier = typeof VALID_TIERS[number]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { invoiceId, message, tier = 'friendly' } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  // Fetch invoice with client + sender details
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), users(business_name, full_name, email, bank_account_name, bank_sort_code, bank_account_number, bank_reference_note), invoice_line_items(*)')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── Tier + cooldown validation ────────────────────────────────────────
  if (!VALID_TIERS.includes(tier as Tier)) {
    return NextResponse.json({ error: 'Invalid tier value' }, { status: 400 })
  }

  const priorLog: any[] = invoice.chase_log ?? []
  const priorCount = priorLog.length

  // Tier progression
  const minPrior = TIER_MIN_PRIOR_CHASES[tier as Tier]
  if (priorCount < minPrior) {
    const tierLabel =
      tier === 'legal'  ? 'a Legal Notice' :
      tier === 'formal' ? 'a Formal Payment Notice' :
      'this chase'
    const needed = minPrior - priorCount
    return NextResponse.json(
      {
        error: `You need ${needed} more chase${needed === 1 ? '' : 's'} on this invoice before sending ${tierLabel}.`,
      },
      { status: 422 }
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // Cooldown is enforced atomically in apply_invoice_chase (see below).

  const client  = invoice.clients  as any
  const sender  = invoice.users    as any

  // Atomic update: apply_invoice_chase checks the cooldown inside the UPDATE
  // WHERE clause so the check and the write are one statement. If a concurrent
  // request already chased within the last 7 days, no rows are updated and the
  // function returns null → 429.
  const newEntry = { chased_at: new Date().toISOString(), note: message ?? null, tier }
  const { data: updatedId, error: chaseErr } = await supabase
    .rpc('apply_invoice_chase', {
      p_invoice_id: invoiceId,
      p_user_id:    user.id,
      p_entry:      newEntry,
    })

  if (chaseErr) {
    console.error('apply_invoice_chase RPC error:', chaseErr.message)
    return NextResponse.json({ error: 'Failed to record chase' }, { status: 500 })
  }
  if (!updatedId) {
    return NextResponse.json(
      { error: `You can chase this invoice again in up to ${COOLDOWN_DAYS} days. Minimum ${COOLDOWN_DAYS} days between chases.` },
      { status: 429 }
    )
  }

  // Try email via Resend
  let emailSent = false
  const resendKey = process.env.RESEND_API_KEY

  if (resendKey && client?.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)

      const businessName = sender?.business_name || sender?.full_name || 'Freelax User'
      const dueDate = new Date(invoice.due_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      const overdueDays = Math.max(
        0,
        Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000),
      )

      // Bank details block for email
      const hasBankDetails = sender?.bank_sort_code && sender?.bank_account_number
      const bankHtml = hasBankDetails
        ? `
          <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:24px 0;border:1px solid #e9ecef;">
            <p style="font-size:12px;font-weight:600;color:#6c757d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">Payment details</p>
            <table style="border-collapse:collapse;width:100%;">
              <tr><td style="color:#6c757d;font-size:13px;padding:3px 0;width:140px;">Account name</td><td style="font-weight:600;font-size:13px;">${escapeHtml(sender.bank_account_name || businessName)}</td></tr>
              <tr><td style="color:#6c757d;font-size:13px;padding:3px 0;">Sort code</td><td style="font-weight:600;font-size:13px;">${escapeHtml(sender.bank_sort_code)}</td></tr>
              <tr><td style="color:#6c757d;font-size:13px;padding:3px 0;">Account number</td><td style="font-weight:600;font-size:13px;">${escapeHtml(sender.bank_account_number)}</td></tr>
              ${sender.bank_reference_note ? `<tr><td style="color:#6c757d;font-size:13px;padding:3px 0;">Reference</td><td style="font-size:13px;">${escapeHtml(sender.bank_reference_note)}</td></tr>` : `<tr><td style="color:#6c757d;font-size:13px;padding:3px 0;">Reference</td><td style="font-size:13px;">${escapeHtml(invoice.invoice_number)}</td></tr>`}
            </table>
          </div>`
        : ''

      const customMessage = message
        ? `<p style="color:#1e293b;margin:16px 0;">${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`
        : ''

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px;">${tier === 'legal' ? 'Notice of Intended Legal Proceedings' : tier === 'formal' ? 'Formal Payment Notice' : 'Payment Reminder'} — ${escapeHtml(invoice.invoice_number)}</h2>
          <p style="color:#64748b;margin-bottom:20px;">From ${escapeHtml(businessName)}</p>

          <p>Hi ${escapeHtml(client.contact_name || client.name)},</p>

          ${tier === 'legal' ? `<p style="color:#7f1d1d;font-weight:600;border-left:3px solid #dc2626;padding-left:12px;margin:16px 0;">This is a formal legal notice. Please read carefully.</p>` : ''}

          ${customMessage}

          <table style="width:100%;border-collapse:collapse;margin:24px 0;background:#f8f9fa;border-radius:8px;overflow:hidden;">
            <tr style="border-bottom:1px solid #e9ecef;">
              <td style="padding:10px 16px;color:#6c757d;font-size:13px;">Invoice</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px;">${escapeHtml(invoice.invoice_number)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e9ecef;">
              <td style="padding:10px 16px;color:#6c757d;font-size:13px;">Amount due</td>
              <td style="padding:10px 16px;font-weight:700;font-size:14px;color:#dc2626;">${escapeHtml(formatCurrency(invoice.total))}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;color:#6c757d;font-size:13px;">Due date</td>
              <td style="padding:10px 16px;font-weight:600;font-size:13px;">${escapeHtml(dueDate)}${overdueDays > 0 ? ` <span style="color:#dc2626">(${overdueDays}d overdue)</span>` : ''}</td>
            </tr>
          </table>

          ${bankHtml}

          <p>Please don't hesitate to get in touch if you have any questions or if there's anything I can help with.</p>

          <p style="margin-top:24px;">Kind regards,<br/><strong>${escapeHtml(sender?.full_name || businessName)}</strong><br/>${escapeHtml(sender?.email || '')}</p>

          <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;"/>
          <p style="font-size:11px;color:#94a3b8;">This is an automated payment reminder sent via <a href="https://freelax.co.uk" style="color:#94a3b8;">Freelax</a> — hassle-free invoicing for freelancers.</p>
        </div>
      `

      await resend.emails.send({
        from:     `Freelax <noreply@freelax.co.uk>`,
        reply_to: sender?.email || undefined,
        to: client.email,
        subject: tier === 'legal'
          ? `Notice of Intended Legal Proceedings — Invoice ${invoice.invoice_number}`
          : tier === 'formal'
          ? `Formal Payment Notice — Invoice ${invoice.invoice_number} (${formatCurrency(invoice.total)} overdue)`
          : `Payment reminder: Invoice ${invoice.invoice_number} — ${formatCurrency(invoice.total)}`,
        html,
      })
      emailSent = true
    } catch (e) {
      console.error('Chase email error:', e)
    }
  }

  await logActivity(supabase, invoiceId, user.id, 'chased', {
    tier,
    emailSent,
    clientEmail: client?.email ?? null,
  })

  return NextResponse.json({
    success: true,
    emailSent,
    chaseCount: (invoice.chase_log?.length ?? 0) + 1,
    message: emailSent
      ? `Chase email sent to ${client?.email}`
      : client?.email
        ? 'Chase logged. Add RESEND_API_KEY to send emails.'
        : 'Chase logged. Add client email address to send emails.',
  })
}
