import { EMAIL_TEXT_MUTED, EMAIL_CTA_BG, EMAIL_CTA_TEXT } from '@/lib/email-colours'
import { escapeHtml } from '@/lib/escape-html'

export type AccountEmailParams = {
  to: string
  subject: string
  heading: string
  bodyHtml: string
  cta?: { label: string; href: string }
}

/** Transactional email to the account holder (notification reminders). */
export async function sendAccountEmail({
  to,
  subject,
  heading,
  bodyHtml,
  cta,
}: AccountEmailParams): Promise<{ sent: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' }
  }

  const ctaBlock = cta
    ? `<p><a href="${escapeHtml(cta.href)}" style="background:${EMAIL_CTA_BG};color:${EMAIL_CTA_TEXT};padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">${escapeHtml(cta.label)}</a></p>`
    : ''

  const html = `
    <p style="margin:0 0 12px;font-size:16px;font-weight:600">${escapeHtml(heading)}</p>
    ${bodyHtml}
    ${ctaBlock}
    <p style="color:${EMAIL_TEXT_MUTED};font-size:12px;margin-top:24px">
      You can turn off these reminders in Freelax → Settings → Notifications.
    </p>
  `

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: 'Freelax <noreply@freelax.co.uk>',
      to,
      subject,
      html,
    })
    return { sent: true }
  } catch (e) {
    console.error('sendAccountEmail failed:', e)
    return { sent: false, error: e instanceof Error ? e.message : 'Send failed' }
  }
}
