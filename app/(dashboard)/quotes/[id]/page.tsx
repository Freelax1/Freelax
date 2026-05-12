'use client'

// app/(dashboard)/quotes/[id]/page.tsx — v2.0
// Features: Send, Accept, Decline, PDF, Edit, Delete (confirm), Convert to Invoice,
//           Auto-expire check, Shareable client link

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  ArrowLeft, Send, CheckCircle, XCircle, ExternalLink,
  Pencil, Trash2, FileText, Link2, X, Clock, ArrowRight,
} from 'lucide-react'
import type { Quote, QuoteLineItem, QuoteActivity } from '@/types/database'

// ── Activity log config ────────────────────────────────────────────────
function activityConfig(entry: QuoteActivity): {
  Icon: React.ElementType; bg: string; iconColor: string; label: string; sub?: string
} {
  const m = (entry.metadata ?? {}) as Record<string, unknown>
  switch (entry.action) {
    case 'sent':
      return {
        Icon: Send, bg: 'bg-blue-50', iconColor: 'text-blue-500',
        label: m.wasResend
          ? (m.emailSent ? `Resent to ${m.clientEmail}` : 'Marked as resent')
          : (m.emailSent ? `Sent to ${m.clientEmail}`   : 'Marked as sent'),
        sub:   !m.emailSent ? 'No email sent — add a client email or Resend API key' : undefined,
      }
    case 'accepted':
      return {
        Icon: CheckCircle, bg: 'bg-green-50', iconColor: 'text-green-600',
        label: 'Marked as accepted',
        sub:   m.from ? `Previous status: ${m.from}` : undefined,
      }
    case 'declined':
      return {
        Icon: XCircle, bg: 'bg-red-50', iconColor: 'text-red-500',
        label: 'Marked as declined',
        sub:   m.from ? `Previous status: ${m.from}` : undefined,
      }
    case 'expired':
      return {
        Icon: Clock, bg: 'bg-slate-100', iconColor: 'text-slate-600',
        label: 'Expired',
        sub:   'Quote passed its validity date',
      }
    case 'status_changed':
      return {
        Icon: ArrowRight, bg: 'bg-slate-100', iconColor: 'text-slate-600',
        label: `Status changed to ${m.to ? (m.to as string).charAt(0).toUpperCase() + (m.to as string).slice(1) : m.to}`,
        sub:   m.from ? `Previous status: ${m.from}` : undefined,
      }
    default:
      return {
        Icon: Clock, bg: 'bg-slate-100', iconColor: 'text-slate-600',
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Delete quote?</h2>
            <p className="text-sm text-slate-500 mt-0.5">This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Deleting...' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuoteDetailPage({ params }: { params: { id: string } }) {
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
      {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )
  if (!quote) return <p className="text-slate-500">Quote not found.</p>

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
        <Link href="/quotes" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to quotes
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">{quote.quote_number}</h1>
            <Badge status={quote.status} />
            {expired && quote.status === 'sent' && (
              <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Expired</span>
            )}
            {!expired && days <= 3 && days >= 0 && quote.status === 'sent' && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{days}d left</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link href={`/quotes/${quote.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
            )}
            {canSend && (
              <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Sending...' : quote.status === 'draft' ? 'Send quote' : 'Resend'}
              </button>
            )}
            {canAccept && (
              <button onClick={() => handleStatusChange('accepted')}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
                <CheckCircle className="w-3.5 h-3.5" /> Mark accepted
              </button>
            )}
            {canDecline && (
              <button onClick={() => handleStatusChange('declined')}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
                <XCircle className="w-3.5 h-3.5" /> Mark declined
              </button>
            )}
            {canConvert && (
              <button onClick={handleConvertToInvoice} disabled={converting}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <FileText className="w-3.5 h-3.5" />
                {converting ? 'Creating...' : 'Create invoice'}
              </button>
            )}
            <button onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              <Link2 className="w-3.5 h-3.5" />
              {linkCopied ? 'Copied!' : 'Client link'}
            </button>
            <a href={`/api/quotes/pdf?id=${quote.id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
              <ExternalLink className="w-3.5 h-3.5" /> PDF
            </a>
            <button onClick={() => setShowDelete(true)}
              aria-label="Delete quote"
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <>
          {msg.type === 'error' && msg.text.toLowerCase().includes('plan') ? (
            <div className="flex items-start gap-4 px-5 py-4 rounded-xl border border-amber-200 bg-amber-50">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 4.8H15l-4 2.9 1.5 4.8L8 10.4 3.5 13.5l1.5-4.8L1 5.8h5.2L8 1z" fill="currentColor"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900 mb-0.5">Upgrade required</p>
                <p className="text-sm text-amber-800">{msg.text}</p>
              </div>
              <a href="/settings?tab=billing" className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors">
                Upgrade
              </a>
              <button onClick={() => setMsg(null)} className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
              msg.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {msg.type === 'success' ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              )}
              <span className="flex-1">{msg.text}</span>
              <button onClick={() => setMsg(null)} aria-label="Dismiss message" className="opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Accepted banner with convert CTA */}
      {quote.status === 'accepted' && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800 text-sm">Quote accepted</p>
            <p className="text-xs text-green-600 mt-0.5">Ready to convert into a draft invoice with one click.</p>
          </div>
          <button onClick={handleConvertToInvoice} disabled={converting}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 shrink-0">
            <FileText className="w-4 h-4" />
            {converting ? 'Creating invoice...' : 'Create invoice from quote'}
          </button>
        </div>
      )}

      {/* Quote — Letterhead design */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
        <div style={{ padding: '32px 40px 28px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="q-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {sender?.logo_url
                ? <img src={sender.logo_url} alt="" style={{ height: 40, objectFit: 'contain', marginBottom: 8, display: 'block' }} />
                : <p style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 4 }}>{sender?.business_name || sender?.full_name || ''}</p>
              }
              {sender?.email && <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{sender.email}</p>}
              {sender?.address_line1 && <p style={{ fontSize: 12, color: '#475569' }}>{sender.address_line1}{sender?.city ? `, ${sender.city}` : ''}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>Quote</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>{quote.quote_number}</p>
            </div>
          </div>
        </div>

        {/* Prepared for + dates */}
        <div style={{ padding: '24px 40px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="q-bill-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Prepared for</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: 3 }}>{client?.name ?? '—'}</p>
              {client?.contact_name && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{client.contact_name}</p>}
              {client?.email && <p style={{ fontSize: 12, color: '#475569' }}>{client.email}</p>}
            </div>
            <div className="q-dates" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 3 }}>Issue date</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{new Date(quote.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 3 }}>Valid until</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: expired ? '#dc2626' : '#0f172a' }}>{quote.expiry_date ? new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
              <div style={{ marginTop: 4 }}>
                {quote.status === 'accepted' && <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', border: '1.5px solid #15803d', padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Accepted</span>}
                {quote.status === 'declined' && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', border: '1.5px solid #dc2626', padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Declined</span>}
                {expired && quote.status === 'sent' && <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', border: '1.5px solid #e2e8f0', padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Expired</span>}
                {quote.status === 'draft' && <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', border: '1.5px solid #e2e8f0', padding: '3px 10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Draft</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ padding: '24px 40px' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'left' }}>Description</th>
                <th className="q-hide" style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>Qty</th>
                <th className="q-hide" style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>Unit price</th>
                <th className="q-hide" style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>VAT</th>
                <th style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '9px 0', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: QuoteLineItem) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '12px 0', fontSize: 13, color: '#334155' }}>{item.description}</td>
                  <td className="q-hide" style={{ padding: '12px 0', fontSize: 12, color: '#475569', textAlign: 'right' }}>{item.quantity}</td>
                  <td className="q-hide" style={{ padding: '12px 0', fontSize: 12, color: '#475569', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                  <td className="q-hide" style={{ padding: '12px 0', fontSize: 12, color: '#475569', textAlign: 'right' }}>{item.vat_rate}%</td>
                  <td style={{ padding: '12px 0', fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer: validity + totals */}
          <div className="q-footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Validity</p>
              <p style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.6 }}>
                {quote.expiry_date
                  ? <>Valid until {new Date(quote.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</>
                  : 'No expiry date set.'}
              </p>
              {quote.notes && <p style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 8 }}>{quote.notes}</p>}
            </div>
            <div className="q-totals" style={{ width: 220, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                <span>Subtotal</span><span style={{ color: '#475569', fontWeight: 500 }}>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                <span>VAT</span><span style={{ color: '#475569', fontWeight: 500 }}>{formatCurrency(quote.vat_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontSize: 15, fontWeight: 800, color: '#0f172a', borderTop: '1.5px solid #0f172a', marginTop: 4 }}>
                <span>Total</span><span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Doc footer */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#475569' }}>{quote.quote_number} · {sender?.business_name || sender?.full_name || ''}</span>
            <span style={{ fontSize: 10, color: '#475569' }}>Powered by Freelax</span>
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-800">Activity</h2>
          {activity.length > 0 && (
            <span className="ml-auto text-xs text-slate-600">
              {activity.length} event{activity.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {activity.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Clock className="w-6 h-6 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-600">No activity recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">Events will appear here when the quote is sent, accepted, declined, or expires.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {[...activity].reverse().map((entry: QuoteActivity) => {
              const cfg = activityConfig(entry)
              return (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <cfg.Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium">{cfg.label}</p>
                    {cfg.sub && <p className="text-xs text-slate-600 mt-0.5">{cfg.sub}</p>}
                  </div>
                  <p className="text-xs text-slate-600 shrink-0 pt-0.5">
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
