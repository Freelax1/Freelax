import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/tax-calculations'
import { CreditCard, CheckCircle } from '@phosphor-icons/react/dist/ssr'

export const dynamic = 'force-dynamic'

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ paid?: string }>
}) {
  const { token } = await params
  const searchParamsResolved = await searchParams
  const supabase = createServiceClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*), invoice_line_items(*), users(business_name, full_name, email, phone, logo_url, address_line1, address_line2, city, postcode, bank_account_name, bank_sort_code, bank_account_number, bank_reference_note)')
    .eq('public_token', token)
    .single()

  if (!invoice) notFound()

  const sender    = invoice.users
  const client    = invoice.clients
  const lineItems = invoice.invoice_line_items ?? []
  const isPaid    = invoice.status === 'paid' || searchParamsResolved.paid === 'true'
  const isOverdue = invoice.status === 'overdue'

  const hasBankDetails = sender?.bank_sort_code && sender?.bank_account_number

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-sunken)', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @media (max-width: 640px) {
          .pub-header { flex-direction: column !important; gap: 12px !important; }
          .pub-bill-row { flex-direction: column !important; gap: 16px !important; }
          .pub-dates { text-align: left !important; }
          .pub-footer-row { flex-direction: column !important; gap: 20px !important; }
          .pub-totals { width: 100% !important; }
          .pub-hide { display: none !important; }
        }
      `}</style>

      <div className="mx-auto py-10 px-5 pb-16" style={{ maxWidth: 680 }}>

        {/* Status banners */}
        {isPaid && (
          <div className="flex items-center gap-2.5 mb-5 rounded-md py-3 px-4" style={{ background: 'var(--success-50)', border: '1px solid var(--success-200)' }}>
            <CheckCircle weight="regular" style={{ width: 16, height: 16, color: 'var(--success-600)', flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--success-700)' }}>Payment received – thank you!</span>
          </div>
        )}
        {isOverdue && !isPaid && (
          <div className="mb-5 rounded-md py-3 px-4" style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-200)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--danger-800)' }}>This invoice is overdue. Please arrange payment as soon as possible.</span>
          </div>
        )}

        {/* Invoice card */}
        <div style={{ background: 'var(--surface-card)', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)' }}>

          {/* Header */}
          <div className="pt-8 px-10 pb-7" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="pub-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {sender?.logo_url
                  ? <img src={sender.logo_url} alt="" className="mb-2 block" style={{ height: 40, objectFit: 'contain' }} />
                  : <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{sender?.business_name || sender?.full_name || ''}</p>
                }
                {sender?.email && <p className="mt-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{sender.email}</p>}
                {sender?.address_line1 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{sender.address_line1}{sender?.city ? `, ${sender.city}` : ''}</p>}
                {sender?.vat_number && <p className="mt-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>VAT: {sender.vat_number}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="mb-1.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Invoice</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          {/* Bill to + dates */}
          <div className="py-6 px-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="pub-bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="mb-2" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Bill to</p>
                <p className="mb-1" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{client?.name}</p>
                {client?.contact_name && <p className="mt-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{client.contact_name}</p>}
                {client?.email && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{client.email}</p>}
              </div>
              <div className="pub-dates flex flex-col gap-2.5" style={{ textAlign: 'right' }}>
                <div>
                  <p className="mb-1" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Issue date</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(invoice.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="mb-1" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Due date</p>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: isOverdue ? 'var(--danger-600)' : 'var(--text-primary)' }}>{new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                {isPaid && (
                  <div className="mt-1">
                    <span className="py-1 px-2.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--success-600)', border: '1.5px solid var(--success-600)' }}>Paid</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="py-6 px-10">
            <table className="mb-6" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
                  <th className="py-2 text-left text-micro font-semibold text-text-secondary">Description</th>
                  <th className="py-2 text-right text-micro font-semibold text-text-secondary">Qty</th>
                  <th className="py-2 text-right text-micro font-semibold text-text-secondary">Unit price</th>
                  <th className="py-2 text-right text-micro font-semibold text-text-secondary">VAT</th>
                  <th className="py-2 text-right text-micro font-semibold text-text-secondary">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-3" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{item.description}</td>
                    <td className="pub-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>{item.quantity}</td>
                    <td className="pub-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                    <td className="pub-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>{item.vat_rate}%</td>
                    <td className="py-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{formatCurrency(item.line_total ?? item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer: payment details + totals */}
            <div className="pub-footer-row flex justify-between items-start gap-6">
              <div>
                {hasBankDetails && (
                  <>
                    <p className="mb-2.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Payment details</p>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: 'Account name',   value: sender.bank_account_name || sender.business_name || sender.full_name },
                        { label: 'Sort code',      value: sender.bank_sort_code },
                        { label: 'Account number', value: sender.bank_account_number },
                        { label: 'Reference',      value: sender.bank_reference_note || invoice.invoice_number },
                      ].map((r: any) => (
                        <div key={r.label} className="flex gap-4">
                          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', width: 110, flexShrink: 0 }}>{r.label}</span>
                          <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-body)' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {invoice.payment_terms && <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: hasBankDetails ? 12 : 0 }}>{invoice.payment_terms}</p>}
                {invoice.notes && <p className="mt-1.5" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{invoice.notes}</p>}
              </div>

              <div className="pub-totals" style={{ width: 220, flexShrink: 0 }}>
                <div className="flex justify-between py-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Subtotal</span><span style={{ fontWeight: 500 }}>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>VAT</span><span style={{ fontWeight: 500 }}>{formatCurrency(invoice.vat_amount)}</span>
                </div>
                <div className="flex justify-between pt-3 mt-1" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', borderTop: '1.5px solid var(--text-primary)' }}>
                  <span>Total due</span><span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Pay Now CTA */}
            {!isPaid && (
              <div className="mt-8">
                <form method="POST" action="/api/invoices/create-payment">
                  <input type="hidden" name="token" value={token} />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2.5 py-4 px-6"
                    style={{
                      background: 'var(--text-primary)', color: 'var(--text-on-dark)',
                      border: 'none', borderRadius: 6, fontSize: 'var(--text-sm)', fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s', letterSpacing: '-0.01em',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <CreditCard weight="regular" style={{ width: 16, height: 16 }} /> Pay {formatCurrency(invoice.total)} securely
                  </button>
                </form>
                <p className="text-center mt-2.5" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                  Secured by Stripe · Your card details are never stored
                </p>
              </div>
            )}

            {/* Doc footer */}
            <div className="mt-7 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-disabled)' }}>{invoice.invoice_number} · {sender?.business_name || sender?.full_name || ''}</span>
              <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-disabled)' }}>Powered by Freelax</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
