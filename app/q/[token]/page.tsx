// app/q/[token]/page.tsx — Public quote view (no login required)
// Brand-matched design — charcoal & black, matching landing page identity

import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/tax-calculations'
import { notFound } from 'next/navigation'

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, clients(*), quote_line_items(*), users(business_name, full_name, email, logo_url, address_line1, city)')
    .eq('public_token', token)
    .single()

  if (!quote) notFound()

  const client    = (quote as any).clients
  const sender    = (quote as any).users
  const lineItems = (quote as any).quote_line_items ?? []
  const expired   = new Date(quote.expiry_date) < new Date()
  const accepted  = quote.status === 'accepted'
  const declined  = quote.status === 'declined'

  // Don't expose pricing/line items for expired quotes that haven't reached a terminal state
  if (expired && !accepted && !declined) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-sunken)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="py-10 px-6 mx-auto text-center" style={{ maxWidth: 440 }}>
          <div className="py-10 px-8 rounded-md" style={{ background: 'var(--surface-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p className="mb-4" style={{ fontSize: 'var(--text-2xl)' }}>⏱</p>
            <h1 className="mb-2" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>This quote has expired</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {quote.quote_number} expired on {new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Please contact {sender?.business_name || sender?.full_name || 'the sender'} for an updated quote.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-sunken)', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @media (max-width: 640px) {
          .qpub-header { flex-direction: column !important; gap: 12px !important; }
          .qpub-bill-row { flex-direction: column !important; gap: 16px !important; }
          .qpub-dates { text-align: left !important; }
          .qpub-footer-row { flex-direction: column !important; gap: 20px !important; }
          .qpub-totals { width: 100% !important; }
          .qpub-hide { display: none !important; }
          .qpub-cta { flex-direction: column !important; }
        }
      `}</style>

      <div className="mx-auto py-10 px-5 pb-16" style={{ maxWidth: 680 }}>

        {/* Status banners */}
        {accepted && (
          <div className="flex items-center gap-2.5 mb-5 rounded-md" style={{ background: 'var(--success-50)', border: '1px solid var(--success-200)', padding: '12px 18px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="var(--success-600)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--success-700)' }}>This quote has been accepted</span>
          </div>
        )}
        {declined && (
          <div className="mb-5 rounded-md" style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-200)', padding: '12px 18px' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--danger-600)' }}>This quote was declined</span>
          </div>
        )}
        {expired && !accepted && !declined && (
          <div className="mb-5 rounded-md" style={{ background: 'var(--warning-50)', border: '1px solid var(--warning-200)', padding: '12px 18px' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--warning-800)' }}>This quote has expired</span>
          </div>
        )}

        {/* Quote card */}
        <div style={{ background: 'var(--surface-card)', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)' }}>

          {/* Header */}
          <div className="pt-8 px-10 pb-7" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="qpub-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {sender?.logo_url
                  ? <img src={sender.logo_url} alt="" className="mb-2 block" style={{ height: 40, objectFit: 'contain' }} />
                  : <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{sender?.business_name || sender?.full_name || ''}</p>
                }
                {sender?.email && <p className="mt-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{sender.email}</p>}
                {sender?.address_line1 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{sender.address_line1}{sender?.city ? `, ${sender.city}` : ''}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="mb-1.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Quote</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{quote.quote_number}</p>
              </div>
            </div>
          </div>

          {/* Prepared for + dates */}
          <div className="py-6 px-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="qpub-bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="mb-2" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Prepared for</p>
                <p className="mb-1" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{client?.name}</p>
                {client?.contact_name && <p className="mt-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{client.contact_name}</p>}
                {client?.email && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{client.email}</p>}
              </div>
              <div className="qpub-dates flex flex-col gap-2.5" style={{ textAlign: 'right' }}>
                <div>
                  <p className="mb-1" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Issue date</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(quote.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="mb-1" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Valid until</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: expired ? 'var(--danger-600)' : 'var(--text-primary)' }}>{new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="mt-1">
                  {accepted && <span style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--success-600)', border: '1.5px solid var(--success-600)', padding: '3px 10px' }}>Accepted</span>}
                  {declined && <span style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--danger-600)', border: '1.5px solid var(--danger-600)', padding: '3px 10px' }}>Declined</span>}
                  {expired && !accepted && !declined && <span style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', border: '1.5px solid var(--border-default)', padding: '3px 10px' }}>Expired</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="py-6 px-10">
            <table className="mb-6" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', padding: '9px 0', textAlign: 'left' }}>Description</th>
                  <th className="qpub-hide" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', padding: '9px 0', textAlign: 'right' }}>Qty</th>
                  <th className="qpub-hide" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', padding: '9px 0', textAlign: 'right' }}>Unit price</th>
                  <th className="qpub-hide" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', padding: '9px 0', textAlign: 'right' }}>VAT</th>
                  <th style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', padding: '9px 0', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-3" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{item.description}</td>
                    <td className="qpub-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>{item.quantity}</td>
                    <td className="qpub-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                    <td className="qpub-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>{item.vat_rate}%</td>
                    <td className="py-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals + notes */}
            <div className="qpub-footer-row flex justify-between items-start gap-6 mb-6">
              <div>
                {quote.notes && <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>{quote.notes}</p>}
              </div>
              <div className="qpub-totals" style={{ width: 220, flexShrink: 0 }}>
                <div className="flex justify-between py-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Subtotal</span><span style={{ fontWeight: 500 }}>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>VAT</span><span style={{ fontWeight: 500 }}>{formatCurrency(quote.vat_amount)}</span>
                </div>
                <div className="flex justify-between pt-3 mt-1" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', borderTop: '1.5px solid var(--text-primary)' }}>
                  <span>Total</span><span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>

            {/* Accept / Decline CTA */}
            {quote.status === 'sent' && !expired && (
              <div className="pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <p className="mb-1" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Ready to proceed?</p>
                <p className="mb-4" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  This quote is valid until {new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </p>
                <div className="qpub-cta flex gap-2.5">
                  <form method="POST" action={`/api/quotes/respond?token=${token}&action=accept`} style={{ flex: 1 }}>
                    <button type="submit" style={{ width: '100%', padding: '13px 20px', background: 'var(--text-primary)', color: 'var(--text-on-dark)', border: 'none', borderRadius: 6, fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'var(--font-sans)' }}>
                      Accept quote →
                    </button>
                  </form>
                  <form method="POST" action={`/api/quotes/respond?token=${token}&action=decline`} style={{ flex: 1 }}>
                    <button type="submit" style={{ width: '100%', padding: '13px 20px', background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Doc footer */}
            <div className="mt-7 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-disabled)' }}>{quote.quote_number} · {sender?.business_name || sender?.full_name || ''}</span>
              <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-disabled)' }}>Powered by Freelax</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
