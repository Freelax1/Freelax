'use client'

// app/(dashboard)/quotes/[id]/page.tsx — v2.0
// Features: Send, Accept, Decline, PDF, Edit, Delete (confirm), Convert to Invoice,
//           Auto-expire check, Shareable client link

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchQuoteById, deleteQuote } from '@/lib/api/quotes'
import { fetchCurrentUser } from '@/lib/api/users'
import { createInvoice, createInvoiceLineItems, fetchMaxInvoiceNumber } from '@/lib/api/invoices'
import { generateInvoiceNumber } from '@/lib/logic/invoices'
import { isQuoteExpired, daysUntilExpiry } from '@/lib/logic/quotes'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/badge'
import Link from 'next/link'
import {
  ArrowLeft, PaperPlaneTilt, CheckCircle, XCircle, ArrowSquareOut,
  PencilSimple, Trash, FileText, LinkSimple, X, Clock, ArrowRight,
} from '@phosphor-icons/react'
import type { Quote, QuoteLineItem, QuoteActivity } from '@/types/database'

// ── Activity log config ────────────────────────────────────────────────
function activityConfig(entry: QuoteActivity): {
  Icon: React.ElementType; bg: string; iconColor: string; label: string; sub?: string
} {
  const m = (entry.metadata ?? {}) as Record<string, unknown>
  switch (entry.action) {
    case 'sent':
      return {
        Icon: PaperPlaneTilt, bg: 'bg-forest-50', iconColor: 'text-forest-600',
        label: m.wasResend
          ? (m.emailSent ? `Resent to ${m.clientEmail}` : 'Marked as resent')
          : (m.emailSent ? `Sent to ${m.clientEmail}`   : 'Marked as sent'),
        sub:   !m.emailSent ? 'No email sent — add a client email or Resend API key' : undefined,
      }
    case 'accepted':
      return {
        Icon: CheckCircle, bg: 'bg-success-50', iconColor: 'text-success-600',
        label: 'Marked as accepted',
        sub:   m.from ? `Previous status: ${m.from}` : undefined,
      }
    case 'declined':
      return {
        Icon: XCircle, bg: 'bg-danger-50', iconColor: 'text-danger-500',
        label: 'Marked as declined',
        sub:   m.from ? `Previous status: ${m.from}` : undefined,
      }
    case 'expired':
      return {
        Icon: Clock, bg: 'bg-surface-sunken', iconColor: 'text-text-secondary',
        label: 'Expired',
        sub:   'Quote passed its validity date',
      }
    case 'status_changed':
      return {
        Icon: ArrowRight, bg: 'bg-surface-sunken', iconColor: 'text-text-secondary',
        label: `Status changed to ${m.to ? (m.to as string).charAt(0).toUpperCase() + (m.to as string).slice(1) : m.to}`,
        sub:   m.from ? `Previous status: ${m.from}` : undefined,
      }
    default:
      return {
        Icon: Clock, bg: 'bg-surface-sunken', iconColor: 'text-text-secondary',
        label: entry.action,
      }
  }
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel, loading }: {
  onConfirm: () => void
  onCancel:  () => void
  loading:   boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <div className="bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-danger-100 rounded-full flex items-center justify-center shrink-0">
            <Trash weight="regular" className="w-5 h-5 text-danger-600" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">Delete quote?</h2>
            <p className="text-sm text-text-muted mt-0.5">This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-border-default rounded-lg text-sm text-text-secondary hover:bg-surface-sunken">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg text-sm font-medium hover:bg-danger-700 disabled:opacity-50">
            {loading ? 'Deleting...' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [quote, setQuote]         = useState<Quote | null>(null)
  const [activity, setActivity]   = useState<QuoteActivity[]>([])
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(false)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function load() {
    const supabase = createClient()
    const [q, { data: acts }] = await Promise.all([
      fetchQuoteById(params.id),
      supabase
        .from('quote_activity')
        .select('*')
        .eq('quote_id', params.id)
        .order('created_at', { ascending: true }),
    ])
    setQuote(q)
    setActivity(acts ?? [])
    setLoading(false)
  }

  // Auto-expire check on load
  useEffect(() => {
    load().then(async () => {
      await fetch('/api/quotes/update-expired', { method: 'POST' })
    })
  }, [params.id])

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  async function handleSend() {
    setSending(true)
    const res  = await fetch('/api/quotes/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: params.id }),
    })
    const data = await res.json()
    setSending(false)
    if (res.ok) { flash('success', data.message); load() }
    else flash('error', data.error ?? 'Failed to send')
  }

  async function handleStatusChange(status: string) {
    const res = await fetch('/api/quotes/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: params.id, status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      flash('error', data.error ?? 'Failed to update status')
      return
    }
    load()
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteQuote(params.id)
      router.push('/quotes')
    } catch {
      flash('error', 'Failed to delete quote')
      setDeleting(false)
      setShowDelete(false)
    }
  }

  async function handleConvertToInvoice() {
    if (!quote) return
    setConverting(true)
    try {
      const user  = await fetchCurrentUser()
      if (!user) return
      const maxNumber = await fetchMaxInvoiceNumber(user.id)
      const invNum  = generateInvoiceNumber(maxNumber)
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30)

      const invoice = await createInvoice({
        user_id:        user.id,
        client_id:      quote.client_id   || null,
        project_id:     quote.project_id  || null,
        invoice_number: invNum,
        status:         'draft',
        issue_date:     new Date().toISOString().slice(0, 10),
        due_date:       dueDate.toISOString().slice(0, 10),
        payment_terms:  'Payment due within 30 days',
        notes:          quote.notes || null,
        subtotal:       quote.subtotal,
        vat_amount:     quote.vat_amount,
        total:          quote.total,
      })

      if (invoice) {
        const lineItems = (quote.quote_line_items ?? []).map((l: QuoteLineItem) => ({
          invoice_id:  invoice.id,
          description: l.description,
          quantity:    l.quantity,
          unit_price:  l.unit_price,
          vat_rate:    l.vat_rate,
          line_total:  l.line_total,
        }))
        await createInvoiceLineItems(lineItems)
        router.push(`/invoices/${invoice.id}`)
      }
    } catch {
      flash('error', 'Failed to create invoice')
      setConverting(false)
    }
  }

  function handleCopyLink() {
    if (!quote?.public_token) return
    const url = `${window.location.origin}/q/${quote.public_token}`
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  if (loading) return (
    <div className="space-y-4 max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-sunken rounded-xl animate-pulse" />)}
    </div>
  )
  if (!quote) return <p className="text-text-muted">Quote not found.</p>

  const client    = quote.clients
  const sender    = quote.users
  const lineItems = quote.quote_line_items ?? []
  const expired   = isQuoteExpired(quote.expiry_date)
  const days      = daysUntilExpiry(quote.expiry_date)

  const canSend     = ['draft', 'sent'].includes(quote.status)
  const canAccept   = quote.status === 'sent'
  const canDecline  = quote.status === 'sent'
  const canEdit     = ['draft'].includes(quote.status)
  const canConvert  = ['accepted'].includes(quote.status)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link href="/quotes" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-3">
          <ArrowLeft weight="regular" className="w-4 h-4" /> Back to quotes
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-serif font-semibold text-text-primary">{quote.quote_number}</h1>
            <Badge status={quote.status} />
            {expired && quote.status === 'sent' && (
              <span className="text-xs text-danger-600 bg-danger-50 border border-danger-200 px-2 py-0.5 rounded-lg">Expired</span>
            )}
            {!expired && days <= 3 && days >= 0 && quote.status === 'sent' && (
              <span className="text-xs text-warning-600 bg-warning-50 border border-warning-200 px-2 py-0.5 rounded-lg">{days}d left</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link href={`/quotes/${quote.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-2 border border-border-default rounded-xl text-sm hover:bg-surface-sunken">
                <PencilSimple weight="regular" className="w-3.5 h-3.5" /> Edit
              </Link>
            )}
            {canSend && (
              <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-1.5 px-3 py-2 bg-forest-900 text-white rounded-xl text-sm font-medium hover:bg-forest-900 disabled:opacity-50">
                <PaperPlaneTilt weight="regular" className="w-3.5 h-3.5" />
                {sending ? 'Sending...' : quote.status === 'draft' ? 'Send quote' : 'Resend'}
              </button>
            )}
            {canAccept && (
              <button onClick={() => handleStatusChange('accepted')}
                className="flex items-center gap-1.5 px-3 py-2 bg-success-700 text-white rounded-xl text-sm font-medium hover:bg-success-800">
                <CheckCircle weight="regular" className="w-3.5 h-3.5" /> Mark accepted
              </button>
            )}
            {canDecline && (
              <button onClick={() => handleStatusChange('declined')}
                className="flex items-center gap-1.5 px-3 py-2 bg-danger-50 border border-danger-200 text-danger-700 rounded-xl text-sm font-medium hover:bg-danger-100">
                <XCircle weight="regular" className="w-3.5 h-3.5" /> Mark declined
              </button>
            )}
            {canConvert && (
              <button onClick={handleConvertToInvoice} disabled={converting}
                className="flex items-center gap-1.5 px-3 py-2 bg-forest-600 text-white rounded-xl text-sm font-medium hover:bg-forest-700 disabled:opacity-50">
                <FileText weight="regular" className="w-3.5 h-3.5" />
                {converting ? 'Creating...' : 'Create invoice'}
              </button>
            )}
            <button onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 border border-border-default rounded-xl text-sm hover:bg-surface-sunken">
              <LinkSimple weight="regular" className="w-3.5 h-3.5" />
              {linkCopied ? 'Copied!' : 'Client link'}
            </button>
            <a href={`/api/quotes/pdf?id=${quote.id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-border-default rounded-xl text-sm hover:bg-surface-sunken">
              <ArrowSquareOut weight="regular" className="w-3.5 h-3.5" /> PDF
            </a>
            <button onClick={() => setShowDelete(true)}
              aria-label="Delete quote"
              className="flex items-center gap-1.5 px-3 py-2 border border-danger-200 text-danger-600 rounded-xl text-sm hover:bg-danger-50">
              <Trash weight="regular" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <>
          {msg.type === 'error' && msg.text.toLowerCase().includes('plan') ? (
            <div className="flex items-start gap-4 px-5 py-4 rounded-xl border border-warning-200 bg-warning-50">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-warning-100 border border-warning-200 flex items-center justify-center text-warning-600">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 4.8H15l-4 2.9 1.5 4.8L8 10.4 3.5 13.5l1.5-4.8L1 5.8h5.2L8 1z" fill="currentColor"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warning-900 mb-0.5">Upgrade required</p>
                <p className="text-sm text-warning-800">{msg.text}</p>
              </div>
              <a href="/settings?tab=billing" className="flex-shrink-0 px-4 py-2 bg-warning-500 hover:bg-warning-600 text-white text-sm font-semibold rounded-lg transition-colors">
                Upgrade
              </a>
              <button onClick={() => setMsg(null)} className="flex-shrink-0 text-warning-400 hover:text-warning-600 transition-colors">
                <X weight="regular" className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
              msg.type === 'success'
                ? 'bg-success-50 text-success-800 border-success-200'
                : 'bg-danger-50 text-danger-700 border-danger-200'
            }`}>
              {msg.type === 'success' ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              )}
              <span className="flex-1">{msg.text}</span>
              <button onClick={() => setMsg(null)} aria-label="Dismiss message" className="opacity-50 hover:opacity-100 transition-opacity">
                <X weight="regular" className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Accepted banner with convert CTA */}
      {quote.status === 'accepted' && (
        <div className="bg-success-50 border border-success-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-success-800 text-sm">Quote accepted</p>
            <p className="text-xs text-success-600 mt-0.5">Ready to convert into a draft invoice with one click.</p>
          </div>
          <button onClick={handleConvertToInvoice} disabled={converting}
            className="flex items-center gap-2 px-4 py-2 bg-success-700 text-white rounded-xl text-sm font-medium hover:bg-success-800 disabled:opacity-50 shrink-0">
            <FileText weight="regular" className="w-4 h-4" />
            {converting ? 'Creating invoice...' : 'Create invoice from quote'}
          </button>
        </div>
      )}

      {/* Quote — Letterhead design */}
      <div className="bg-surface-card rounded-xl border border-border-default shadow-sm overflow-hidden">
        <style>{`
          @media (max-width: 640px) {
            .q-header { flex-direction: column !important; gap: 12px !important; }
            .q-bill-row { flex-direction: column !important; gap: 16px !important; }
            .q-dates { text-align: left !important; }
            .q-footer-row { flex-direction: column !important; gap: 20px !important; }
            .q-totals { width: 100% !important; }
            .q-hide { display: none !important; }
          }
        `}</style>

        {/* Header */}
        <div className="pt-8 px-10 pb-7" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="q-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {sender?.logo_url
                ? <img src={sender.logo_url} alt="" className="mb-2 block" style={{ height: 40, objectFit: 'contain' }} />
                : <p className="mb-1" style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{sender?.business_name || sender?.full_name || ''}</p>
              }
              {sender?.email && <p className="mt-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{sender.email}</p>}
              {sender?.address_line1 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{sender.address_line1}{sender?.city ? `, ${sender.city}` : ''}</p>}
            </div>
            <div className="text-right">
              <p className="mb-1.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Quote</p>
              <p style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{quote.quote_number}</p>
            </div>
          </div>
        </div>

        {/* Prepared for + dates */}
        <div className="py-6 px-10" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="q-bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="mb-2" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Prepared for</p>
              <p className="mb-1" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>{client?.name ?? '—'}</p>
              {client?.contact_name && <p className="mt-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{client.contact_name}</p>}
              {client?.email && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{client.email}</p>}
            </div>
            <div className="q-dates flex flex-col gap-2.5" style={{ textAlign: 'right' }}>
              <div>
                <p className="mb-1" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Issue date</p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(quote.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="mb-1" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Valid until</p>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: expired ? 'var(--danger-600)' : 'var(--text-primary)' }}>{quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
              <div className="mt-1">
                {quote.status === 'accepted' && <span className="py-1 px-2.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--success-600)', border: '1.5px solid var(--success-600)' }}>Accepted</span>}
                {quote.status === 'declined' && <span className="py-1 px-2.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--danger-600)', border: '1.5px solid var(--danger-600)' }}>Declined</span>}
                {expired && quote.status === 'sent' && <span className="py-1 px-2.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', border: '1.5px solid var(--border-default)' }}>Expired</span>}
                {quote.status === 'draft' && <span className="py-1 px-2.5" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-secondary)', border: '1.5px solid var(--border-default)' }}>Draft</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="py-6 px-10">
          <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
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
              {lineItems.map((item: QuoteLineItem) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-3" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>{item.description}</td>
                  <td className="q-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>{item.quantity}</td>
                  <td className="q-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                  <td className="q-hide" className="py-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right' }}>{item.vat_rate}%</td>
                  <td className="py-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer: validity + totals */}
          <div className="q-footer-row flex justify-between items-start gap-6">
            <div>
              <p className="mb-2" style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>Validity</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {quote.expiry_date
                  ? <>Valid until {new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</>
                  : 'No expiry date set.'}
              </p>
              {quote.notes && <p className="mt-2" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{quote.notes}</p>}
            </div>
            <div className="q-totals" style={{ width: 220, flexShrink: 0 }}>
              <div className="flex justify-between py-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>Subtotal</span><span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>VAT</span><span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{formatCurrency(quote.vat_amount)}</span>
              </div>
              <div className="flex justify-between pt-3 mt-1" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', borderTop: '1.5px solid var(--text-primary)' }}>
                <span>Total</span><span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Doc footer */}
          <div className="mt-8 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-secondary)' }}>{quote.quote_number} · {sender?.business_name || sender?.full_name || ''}</span>
            <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-secondary)' }}>Powered by Freelax</span>
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-surface-card rounded-xl border border-border-default overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
          <Clock weight="regular" className="w-4 h-4 text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-primary">Activity</h2>
          {activity.length > 0 && (
            <span className="ml-auto text-xs text-text-secondary">
              {activity.length} event{activity.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {activity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Clock weight="regular" className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No activity recorded yet.</p>
            <p className="text-xs text-text-muted mt-1">Events will appear here when the quote is sent, accepted, declined, or expires.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {[...activity].reverse().map((entry: QuoteActivity) => {
              const cfg = activityConfig(entry)
              return (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <cfg.Icon weight="regular" className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary font-medium">{cfg.label}</p>
                    {cfg.sub && <p className="text-xs text-text-secondary mt-0.5">{cfg.sub}</p>}
                  </div>
                  <p className="text-xs text-text-secondary shrink-0 pt-0.5">
                    {new Date(entry.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    {' '}
                    {new Date(entry.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

            {/* Delete modal */}
      {showDelete && (
        <DeleteModal
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  )
}
