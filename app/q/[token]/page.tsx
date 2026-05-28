// app/q/[token]/page.tsx — Public quote view (no login required)
// Brand-matched design — charcoal & black, matching landing page identity

import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/tax-calculations'
import { notFound } from 'next/navigation'

export default async function PublicQuotePage({ params }: { params: { token: string } }) {
  const supabase = createServiceClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, clients(*), quote_line_items(*), users(business_name, full_name, email, logo_url, address_line1, city)')
    .eq('public_token', params.token)
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
      <div style={{ minHeight: '100vh', background: '#f5f4ef', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '40px 32px' }}>
            <p style={{ fontSize: 28, marginBottom: 16 }}>⏱</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>This quote has expired</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              {quote.quote_number} expired on {new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Please contact {sender?.business_name || sender?.full_name || 'the sender'} for an updated quote.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4ef', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
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

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 64px' }}>

        {/* Status banners */}
        {accepted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 18px', marginBottom: 20 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>This quote has been accepted</span>
          </div>
        )}
        {declined && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 18px', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>This quote was declined</span>
          </div>
        )}
        {expired && !accepted && !declined && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 18px', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>This quote has expired</span>
          </div>
        )}

        {/* Quote card */}
        <div style={{ background: '#fff', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)' }}>

          {/* Header */}
          <div style={{ padding: '32px 40px 28px', borderBottom: '1px solid #f1f5f9' }}>
            <div className="qpub-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {sender?.logo_url
                  ? <img src={sender.logo_url} alt="" style={{ height: 40, objectFit: 'contain', marginBottom: 8, display: 'block' }} />
                  : <p style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>{sender?.business_name || sender?.full_name || ''}</p>
                }
                {sender?.email && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{sender.email}</p>}
                {sender?.address_line1 && <p style={{ fontSize: 12, color: '#94a3b8' }}>{sender.address_line1}{sender?.city ? `, ${sender.city}` : ''}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Quote</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>{quote.quote_number}</p>
              </div>
            </div>
          </div>

          {/* Prepared for + dates */}
          <div style={{ padding: '24px 40px', borderBottom: '1px solid #f1f5f9' }}>
            <div className="qpub-bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Prepared for</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: 3 }}>{client?.name}</p>
                {client?.contact_name && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{client.contact_name}</p>}
                {client?.email && <p style={{ fontSize: 12, color: '#94a3b8' }}>{client.email}</p>}
              </div>
              <div className="qpub-dates" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 3 }}>Issue date</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{new Date(quote.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 3 }}>Valid until</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: expired ? '#dc2626' : '#0f172a' }}>{new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div style={{ marginTop: 4 }}>
                  {accepted && <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', border: '1.5px solid #16a34a', padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Accepted</span>}
                  {declined && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', border: '1.5px solid #dc2626', padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Declined</span>}
                  {expired && !accepted && !declined && <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', border: '1.5px solid #e2e8f0', padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Expired</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div style={{ padding: '24px 40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <thead>
                <tr style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'left' }}>Description</th>
                  <th className="qpub-hide" style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>Qty</th>
                  <th className="qpub-hide" style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>Unit price</th>
                  <th className="qpub-hide" style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>VAT</th>
                  <th style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 0', fontSize: 13, color: '#334155' }}>{item.description}</td>
                    <td className="qpub-hide" style={{ padding: '12px 0', fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>{item.quantity}</td>
                    <td className="qpub-hide" style={{ padding: '12px 0', fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                    <td className="qpub-hide" style={{ padding: '12px 0', fontSize: 12, color: '#cbd5e1', textAlign: 'right' }}>{item.vat_rate}%</td>
                    <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals + notes */}
            <div className="qpub-footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
              <div>
                {quote.notes && <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.6 }}>{quote.notes}</p>}
              </div>
              <div className="qpub-totals" style={{ width: 220, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Subtotal</span><span style={{ color: '#475569', fontWeight: 500 }}>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                  <span>VAT</span><span style={{ color: '#475569', fontWeight: 500 }}>{formatCurrency(quote.vat_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 15, fontWeight: 800, color: '#0f172a', borderTop: '1.5px solid #0f172a', marginTop: 4 }}>
                  <span>Total</span><span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>

            {/* Accept / Decline CTA */}
            {quote.status === 'sent' && !expired && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Ready to proceed?</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                  This quote is valid until {new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                </p>
                <div className="qpub-cta" style={{ display: 'flex', gap: 10 }}>
                  <form method="POST" action={`/api/quotes/respond?token=${params.token}&action=accept`} style={{ flex: 1 }}>
                    <button type="submit" style={{ width: '100%', padding: '13px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
                      Accept quote →
                    </button>
                  </form>
                  <form method="POST" action={`/api/quotes/respond?token=${params.token}&action=decline`} style={{ flex: 1 }}>
                    <button type="submit" style={{ width: '100%', padding: '13px 20px', background: '#fff', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Doc footer */}
            <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#e2e8f0' }}>{quote.quote_number} · {sender?.business_name || sender?.full_name || ''}</span>
              <span style={{ fontSize: 10, color: '#e2e8f0' }}>Powered by Freelax</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
