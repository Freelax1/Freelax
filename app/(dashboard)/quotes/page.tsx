'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchCurrentUser } from '@/lib/api/users'
import { fetchQuotes, deleteQuote, fetchQuoteWithLineItems, createQuote, createQuoteLineItems, fetchMaxQuoteNumber } from '@/lib/api/quotes'
import { isQuoteExpired, daysUntilExpiry, generateQuoteNumber } from '@/lib/logic/quotes'
import PageHeader from '@/components/page-header'
import EmptyState from '@/components/empty-state'
import Badge from '@/components/badge'
import Link from 'next/link'
import { MoreVertical, Eye, Pencil, Trash2, Copy, CheckSquare, Square } from 'lucide-react'
import type { Quote, QuoteLineItem } from '@/types/database'

// ── Delete modal ──────────────────────────────────────────────────────
function DeleteModal({ quoteNumber, count, onConfirm, onCancel, loading }: {
  quoteNumber: string; count?: number; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{count && count > 1 ? `Delete ${count} quotes?` : 'Delete quote?'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{count && count > 1 ? `${count} quotes` : quoteNumber} will be permanently removed.</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-3 mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Deleting...' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status modal ──────────────────────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const cfg: Record<string, { label: string; color: string }> = {
    draft:    { label: 'Draft',    color: '#64748B' },
    sent:     { label: 'Sent',     color: '#1A5E8A' },
    accepted: { label: 'Accepted', color: '#1D6B35' },
    declined: { label: 'Declined', color: '#C0392B' },
  }
  const { label, color } = cfg[newStatus] ?? { label: newStatus, color: '#64748B' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-slate-900 mb-1">
          Mark as <span style={{ color }}>{label}</span>?
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {count} quote{count !== 1 ? 's' : ''} will be marked as <span style={{ fontWeight: 600, color }}>{label}</span>.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 1, padding: '10px 16px', background: color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Updating...' : `Mark as ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Kebab menu ────────────────────────────────────────────────────────
function KebabMenu({ quote, onDelete, onDuplicate, onStatusChange, duplicating }: {
  quote: Quote; onDelete: (q: Quote) => void; onDuplicate: (q: Quote) => void
  onStatusChange: (q: Quote, status: string) => void; duplicating?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isDraft = quote.status === 'draft'
  const allStatuses = [
    { key: 'draft',    label: 'Draft',    dot: '#94A3B8', bg: '#F8FAFC', border: 'rgba(0,0,0,0.08)',     text: '#64748B' },
    { key: 'sent',     label: 'Sent',     dot: '#1A5E8A', bg: '#EBF4FD', border: 'rgba(26,94,138,0.2)',  text: '#1A5E8A' },
    { key: 'accepted', label: 'Accepted', dot: '#1D6B35', bg: '#F0FDF4', border: 'rgba(29,107,53,0.2)',  text: '#1D6B35' },
    { key: 'declined', label: 'Declined', dot: '#C0392B', bg: '#FEF2F2', border: 'rgba(192,57,43,0.2)',  text: '#C0392B' },
  ]
  const statusOptions = allStatuses.filter(s => s.key !== quote.status)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50,
          minWidth: 160, overflow: 'hidden',
        }}>
          <Link href={`/quotes/${quote.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <Eye className="w-3.5 h-3.5 text-slate-400" /> View
          </Link>
          {isDraft && (
            <Link href={`/quotes/${quote.id}/edit`} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit
            </Link>
          )}
          <button onClick={e => { e.stopPropagation(); setOpen(false); onDuplicate(quote) }}
            disabled={duplicating}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left border-t border-slate-100 disabled:opacity-40">
            <Copy className="w-3.5 h-3.5 text-slate-400" /> {duplicating ? 'Duplicating…' : 'Duplicate'}
          </button>
          {/* Status options */}
          <div style={{ borderTop: '1px solid #F1F5F9', padding: '6px 8px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 6px' }}>Change status</p>
            {statusOptions.map(s => (
              <button key={s.key} onClick={() => { setOpen(false); onStatusChange(quote, s.key) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = s.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: s.text, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 8px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
                  {s.label}
                </span>
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9' }}>
            <button onClick={e => { e.stopPropagation(); setOpen(false); onDelete(quote) }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bulk bar ──────────────────────────────────────────────────────────
function BulkBar({ count, selectedStatuses, onDelete, onStatusChange, onClear }: {
  count: number
  selectedStatuses: string[]
  onDelete: () => void
  onStatusChange: (status: string) => void
  onClear: () => void
}) {
  const allAre = (st: string) =>
    selectedStatuses.length > 0 && selectedStatuses.every(s => s === st)

  const statusOptions = [
    { key: 'sent',     label: 'Mark as Sent' },
    { key: 'accepted', label: 'Mark as Accepted' },
    { key: 'declined', label: 'Mark as Declined' },
  ].filter(s => !allAre(s.key))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0F172A', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginRight: 4 }}>{count} selected</span>
      {statusOptions.length > 0 && (
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      )}
      {statusOptions.map(s => (
        <button key={s.key} onClick={() => onStatusChange(s.key)} style={{
          fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', cursor: 'pointer', transition: 'background 0.1s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          {s.label}
        </button>
      ))}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      <button onClick={onDelete} style={{
        fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
        background: 'rgba(192,57,43,0.25)', border: '1px solid rgba(192,57,43,0.4)',
        color: '#FF8A80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
      }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,57,43,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(192,57,43,0.25)')}
      >
        <Trash2 style={{ width: 12, height: 12 }} /> Delete
      </button>
      <button onClick={onClear} style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
    </div>
  )
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes]           = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [query, setQuery]             = useState('')
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [statusTarget, setStatusTarget]   = useState<{ quote: Quote; status: string } | null>(null)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  async function load() { setQuotes(await fetchQuotes()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function duplicateQuote(q: Quote) {
    setDuplicating(true)
    try {
      const user = await fetchCurrentUser()
      const uid  = user?.id ?? ''
      const full = await fetchQuoteWithLineItems(q.id)
      const maxNum = await fetchMaxQuoteNumber(uid)
      const newNumber = generateQuoteNumber(maxNum)
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30)
      const newQuote = await createQuote({
        user_id: uid, client_id: full.client_id, project_id: full.project_id ?? null,
        quote_number: newNumber, status: 'draft',
        issue_date: new Date().toISOString().slice(0, 10),
        expiry_date: expiry.toISOString().slice(0, 10),
        notes: full.notes ?? '', subtotal: full.subtotal,
        vat_amount: full.vat_amount, total: full.total,
      })
      if (full.quote_line_items?.length) {
        await createQuoteLineItems(full.quote_line_items.map((li: QuoteLineItem) => ({
          quote_id: newQuote.id, description: li.description,
          quantity: li.quantity, unit_price: li.unit_price, vat_rate: li.vat_rate,
          line_total: li.line_total ?? (Number(li.quantity) * Number(li.unit_price)),
        })))
      }
      window.dispatchEvent(new Event('fd:data-invalidate'))
      router.push(`/quotes/${newQuote.id}`)
    } catch (e) { console.error('Duplicate quote failed', e) }
    finally { setDuplicating(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteQuote(deleteTarget.id); setDeleteTarget(null); load() }
    catch (e) { console.error(e) }
    finally { setDeleting(false) }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map(id => deleteQuote(id)))
      setSelected(new Set()); setBulkDeleteOpen(false); setBulkDeleting(false); load()
    } catch { setBulkDeleting(false) }
  }

  async function handleBulkStatus() {
    if (!bulkStatusTarget) return
    setStatusUpdating(true)
    try {
      const ids = Array.from(selected)
      await Promise.all(ids.map(id =>
        fetch('/api/quotes/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId: id, status: bulkStatusTarget }),
        })
      ))
      setSelected(new Set()); setBulkStatusTarget(null); setStatusUpdating(false); load()
    } catch { setStatusUpdating(false) }
  }

  async function handleStatusChange() {
    if (!statusTarget) return
    setStatusUpdating(true)
    try {
      await fetch('/api/quotes/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: statusTarget.quote.id, status: statusTarget.status }),
      })
      setStatusTarget(null); setStatusUpdating(false); load()
    } catch { setStatusUpdating(false) }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = quotes.filter(q => {
    const sq = query.trim().toLowerCase()
    const matchesQuery = sq.length === 0 || (
      q.quote_number.toLowerCase().includes(sq) ||
      (q.clients?.name ?? '').toLowerCase().includes(sq) ||
      q.status.toLowerCase().includes(sq) ||
      new Date(q.expiry_date).toLocaleDateString('en-GB').includes(sq) ||
      new Date(q.issue_date).toLocaleDateString('en-GB').includes(sq)
    )
    const matchesStatus = statusFilter === 'all' ? true
      : statusFilter === 'expired' ? q.status === 'sent' && isQuoteExpired(q.expiry_date)
      : q.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  const stats = {
    draft:    quotes.filter(q => q.status === 'draft').length,
    sent:     quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    expired:  quotes.filter(q => q.status === 'sent' && isQuoteExpired(q.expiry_date)).length,
  }

  // £ values per status
  const totals = {
    draft:    quotes.filter(q => q.status === 'draft').reduce((s, q) => s + Number(q.total), 0),
    sent:     quotes.filter(q => q.status === 'sent').reduce((s, q) => s + Number(q.total), 0),
    accepted: quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + Number(q.total), 0),
    expired:  quotes.filter(q => q.status === 'sent' && isQuoteExpired(q.expiry_date)).reduce((s, q) => s + Number(q.total), 0),
  }

  return (
    <div>
      <PageHeader className="fd-page-enter"
        title="Quotes"
        subtitle={loading ? '' : `${quotes.length} quotes`}
        action={
          <button onClick={() => router.push('/quotes/new')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
            New quote
          </button>
        }
      />

      {/* Status cards */}
      {!loading && quotes.length > 0 && (
        <div className="fd-stat-grid fd-page-enter">
          {([
            { key: 'draft',    label: 'Draft',    bgColor: '#F8F8F8', hoverColor: '#F0F0F0', borderColor: '#E2E8F0', labelColor: '#999',    valueColor: '#111'    },
            { key: 'sent',     label: 'Sent',     bgColor: '#EBF4FD', hoverColor: '#D6ECFB', borderColor: '#B8D9F0', labelColor: '#1A5E8A', valueColor: '#1A5E8A' },
            { key: 'accepted', label: 'Accepted', bgColor: '#EAFAF0', hoverColor: '#D4F5E2', borderColor: '#B8DFC3', labelColor: '#1D6B35', valueColor: '#1D6B35' },
            { key: 'expired',  label: 'Expired',  bgColor: '#FDECEA', hoverColor: '#FAD7D4', borderColor: '#F5C0BB', labelColor: '#C0392B', valueColor: '#C0392B' },
          ] as const).map(({ key, label, bgColor, hoverColor, borderColor, labelColor, valueColor }) => {
            const isActive = statusFilter === key
            return (
              <button key={key} onClick={() => setStatusFilter(isActive ? 'all' : key)}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = hoverColor }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = bgColor }}
                style={{
                  background: isActive ? '#111' : bgColor,
                  border: `1px solid ${isActive ? '#111' : borderColor}`,
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  textAlign: 'left' as const, transition: 'background 0.15s',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: isActive ? 'rgba(255,255,255,0.5)' : labelColor, marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: isActive ? '#fff' : valueColor, letterSpacing: '-0.02em', marginBottom: 2 }}>{stats[key]}</p>
                <p style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'rgba(255,255,255,0.6)' : valueColor, opacity: isActive ? 1 : 0.8 }}>{formatCurrency(totals[key])}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="fd-page-enter" style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#AAA' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search quotes..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E2E2', borderRadius: 10, fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#111', boxSizing: 'border-box' as const }}
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
          />
          {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: 16 }}>×</button>}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          selectedStatuses={quotes.filter(q => selected.has(q.id)).map(q => q.status)}
          onDelete={() => setBulkDeleteOpen(true)}
          onStatusChange={s => setBulkStatusTarget(s)}
          onClear={() => setSelected(new Set())}
        />
      )}

      <div className="fd-page-enter">
        {!loading && !quotes.length ? (
          <EmptyState icon="📋" title="No quotes yet" description="Quotes let you price work before starting. Accept one and we'll convert it to an invoice automatically."
            action={<button onClick={() => router.push('/quotes/new')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Create a quote</button>} />
        ) : (
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-visible">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(q => q.id)))}
                      className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  {['Quote #', 'Client', 'Issued', 'Valid until', 'Total', 'Status', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 font-medium text-slate-600 ${h === 'Total' ? 'text-right' : h === '' ? 'w-10' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>)}</tr>
                )) : filtered.map(q => {
                  const expired  = q.status === 'sent' && isQuoteExpired(q.expiry_date)
                  const days     = daysUntilExpiry(q.expiry_date)
                  const isSelected = selected.has(q.id)
                  return (
                    <tr key={q.id} className="hover:bg-slate-50" style={{ background: isSelected ? '#F8FAFC' : undefined }}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(q.id)} className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/quotes/${q.id}`} className="text-blue-600 hover:underline">{q.quote_number}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{q.clients?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(q.issue_date).toLocaleDateString('en-GB')}</td>
                      <td className={`px-4 py-3 ${expired ? 'text-red-600 font-medium' : days <= 3 && days >= 0 && q.status === 'sent' ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                        {new Date(q.expiry_date).toLocaleDateString('en-GB')}
                        {expired && <span className="ml-1 text-xs">(expired)</span>}
                        {!expired && days <= 3 && days >= 0 && q.status === 'sent' && <span className="ml-1 text-xs">({days}d left)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(q.total)}</td>
                      <td className="px-4 py-3"><Badge status={q.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <KebabMenu quote={q} onDelete={setDeleteTarget} onDuplicate={duplicateQuote}
                          onStatusChange={(q, status) => setStatusTarget({ quote: q, status })}
                          duplicating={duplicating} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


        {/* Mobile cards */}
        <div className="md:hidden fd-page-enter space-y-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="h-4 fd-skeleton w-24 mb-3" /><div className="h-3 fd-skeleton w-32" />
            </div>
          )) : filtered.map(q => {
            const expired = q.status === 'sent' && isQuoteExpired(q.expiry_date)
            const days = daysUntilExpiry(q.expiry_date)
            const isSelected = selected.has(q.id)
            return (
              <div key={q.id} className={`bg-white rounded-xl border p-4 ${isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(q.id)} className="flex items-center flex-shrink-0">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                    <Link href={`/quotes/${q.id}`} className="font-medium text-blue-600 hover:underline truncate">{q.quote_number}</Link>
                  </div>
                  <span className="font-semibold text-slate-900 flex-shrink-0">{formatCurrency(q.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-slate-600 truncate">{q.clients?.name ?? '—'}</span>
                  <div className="flex-shrink-0"><Badge status={q.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-7">
                  <span className={`text-xs ${expired ? 'text-red-600 font-medium' : !expired && days <= 3 && days >= 0 && q.status === 'sent' ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                    Valid until {new Date(q.expiry_date).toLocaleDateString('en-GB')}
                    {expired && ' · expired'}
                    {!expired && days <= 3 && days >= 0 && q.status === 'sent' && ` · ${days}d left`}
                  </span>
                  <KebabMenu quote={q} onDelete={setDeleteTarget} onDuplicate={duplicateQuote}
                    onStatusChange={(q, status) => setStatusTarget({ quote: q, status })} duplicating={duplicating} />
                </div>
              </div>
            )
          })}
        </div>

      {deleteTarget && <DeleteModal quoteNumber={deleteTarget.quote_number} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
      {bulkDeleteOpen && <DeleteModal quoteNumber="" count={selected.size} onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteOpen(false)} loading={bulkDeleting} />}
      {statusTarget && <StatusModal count={1} newStatus={statusTarget.status} onConfirm={handleStatusChange} onCancel={() => setStatusTarget(null)} loading={statusUpdating} />}
      {bulkStatusTarget && <StatusModal count={selected.size} newStatus={bulkStatusTarget} onConfirm={handleBulkStatus} onCancel={() => setBulkStatusTarget(null)} loading={statusUpdating} />}
    </div>
  )
}
