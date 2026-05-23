'use client'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchQuotes, deleteQuote } from '@/lib/api/quotes'
import { isQuoteExpired, daysUntilExpiry } from '@/lib/logic/quotes'
import PageHeader from '@/components/page-header'
import EmptyState from '@/components/empty-state'
import Badge from '@/components/badge'
import Link from 'next/link'
import { DotsThreeVertical, Eye, PencilSimple, Trash, CheckSquare, Square } from '@phosphor-icons/react'
import type { Quote } from '@/types/database'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'

// ── Status modal ──────────────────────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined',
  }
  const label = STATUS_LABELS[newStatus] ?? newStatus
  const color = tonePalette(newStatus).text
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/45"
      onClick={onCancel}>
      <div className="bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-text-primary mb-1">
          Mark as <span style={{ color }}>{label}</span>?
        </h2>
        <p className="text-sm text-text-secondary mb-5">
          {count} quote{count !== 1 ? 's' : ''} will be marked as <span style={{ fontWeight: 600, color }}>{label}</span>.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-border-default rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-sunken">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className={cn('flex-1 px-4 py-2.5 text-white border-none rounded-lg text-sm font-medium', loading ? 'cursor-default opacity-60' : 'cursor-pointer')}
            style={{ background: color }}>
            {loading ? 'Updating...' : `Mark as ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Kebab menu ────────────────────────────────────────────────────────
function KebabMenu({ quote, onDelete, onStatusChange }: {
  quote: Quote; onDelete: (q: Quote) => void
  onStatusChange: (q: Quote, status: string) => void
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
  const allStatuses = ['draft', 'sent', 'accepted', 'declined']
  const statusOptions = allStatuses.filter(s => s !== quote.status)

  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label="Quote actions"
        className="p-1.5 rounded-xl hover:bg-surface-sunken text-text-secondary hover:text-text-primary transition-colors">
        <DotsThreeVertical weight="regular" className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] bg-surface-card border border-border-default rounded-xl z-50 min-w-[160px] overflow-hidden shadow-popover">
          <Link href={`/quotes/${quote.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken">
            <Eye weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> View
          </Link>
          {isDraft && (
            <Link href={`/quotes/${quote.id}/edit`} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken">
              <PencilSimple weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> Edit
            </Link>
          )}
          {/* Status options */}
          <div className="border-t border-border-subtle py-1.5">
            <p className="text-micro font-semibold text-text-secondary px-4 pt-1 pb-1.5">Change status</p>
            {statusOptions.map(s => (
              <button key={s} onClick={() => { setOpen(false); onStatusChange(quote, s) }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken w-full text-left">
                <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tonePalette(s).dot }} />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="border-t border-border-subtle">
            <button onClick={e => { e.stopPropagation(); setOpen(false); onDelete(quote) }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 w-full text-left">
              <Trash weight="regular" className="w-3.5 h-3.5" /> Delete
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
    <div className="flex items-center gap-2.5 bg-forest-950 rounded-lg px-4 py-2.5 mb-3">
      <span className="text-sm font-medium text-white mr-1">{count} selected</span>
      {statusOptions.length > 0 && (
        <div className="w-px h-4 bg-white/15" />
      )}
      {statusOptions.map(s => (
        <button key={s.key} onClick={() => onStatusChange(s.key)}
          className="text-xs font-medium px-2.5 py-1 rounded-md text-white cursor-pointer bg-white/[0.08] border border-white/[0.12] hover:bg-white/15 transition-colors"
        >
          {s.label}
        </button>
      ))}
      <div className="w-px h-4 bg-white/15" />
      <button onClick={onDelete}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md cursor-pointer text-danger-300 bg-danger-800/30 border border-danger-700/50 hover:bg-danger-800/40 transition-colors"
      >
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </button>
      <button onClick={onClear} className="ml-auto text-xs cursor-pointer bg-transparent border-none text-white/70">Clear</button>
    </div>
  )
}

type QuoteSortField = 'quote_number' | 'issue_date' | 'expiry_date' | 'total'
const QUOTE_SORT_OPTIONS: { label: string; field: QuoteSortField; dir: 'asc' | 'desc' }[] = [
  { label: 'Newest first', field: 'issue_date',  dir: 'desc' },
  { label: 'Oldest first', field: 'issue_date',  dir: 'asc' },
  { label: 'Expiry date',  field: 'expiry_date', dir: 'asc' },
  { label: 'Amount ↓',    field: 'total',        dir: 'desc' },
  { label: 'Amount ↑',    field: 'total',        dir: 'asc' },
]

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes]           = useState<Quote[]>([])
  const [loading, setLoading]         = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [query, setQuery]             = useState('')
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [statusTarget, setStatusTarget]   = useState<{ quote: Quote; status: string } | null>(null)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [sortField, setSortField] = useState<QuoteSortField>('issue_date')
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc')

  async function load() { setQuotes(await fetchQuotes()); setLoading(false) }
  useEffect(() => { load() }, [])

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

  function toggleQuoteSort(field: QuoteSortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }
  const mobileSortIdx = QUOTE_SORT_OPTIONS.findIndex(o => o.field === sortField && o.dir === sortDir)
  const mobileSortLabel = mobileSortIdx >= 0 ? QUOTE_SORT_OPTIONS[mobileSortIdx].label : (sortDir === 'asc' ? '↑' : '↓')
  function cycleQuoteSort() {
    const next = QUOTE_SORT_OPTIONS[(mobileSortIdx >= 0 ? mobileSortIdx + 1 : 1) % QUOTE_SORT_OPTIONS.length]
    setSortField(next.field); setSortDir(next.dir)
  }
  const sorted = [...filtered].sort((a, b) => {
    const av = sortField === 'total' ? Number(a.total) : String(a[sortField] ?? '')
    const bv = sortField === 'total' ? Number(b.total) : String(b[sortField] ?? '')
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
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
          <button onClick={() => router.push('/quotes/new')} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">
            New quote
          </button>
        }
      />

      {/* Status cards */}
      {!loading && quotes.length > 0 && (
        <div className="fd-stat-grid fd-page-enter">
          {(['draft', 'sent', 'accepted', 'expired'] as const).map(key => {
            const t = tonePalette(key)
            const label = key.charAt(0).toUpperCase() + key.slice(1)
            const isActive = statusFilter === key
            return (
              <button key={key} onClick={() => setStatusFilter(isActive ? 'all' : key)}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = t.hover }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = t.bg }}
                className="rounded-lg px-4 py-3.5 cursor-pointer text-left transition-[background] duration-150"
                style={{
                  background: isActive ? 'var(--text-primary)' : t.bg,
                  border: `1px solid ${isActive ? 'var(--text-primary)' : t.border}`,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                <p className="text-micro font-semibold mb-1.5" style={{ color: isActive ? 'rgba(255,255,255,0.5)' : t.text }}>{label}</p>
                <p className="text-xl font-semibold tracking-tight mb-px" style={{ color: isActive ? 'var(--text-on-dark)' : t.textValue }}>{stats[key]}</p>
                <p className="text-caption font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : t.textValue }}>{formatCurrency(totals[key])}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Search + mobile sort */}
      <div className="fd-page-enter mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[360px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search quotes..."
              className="w-full pl-9 pr-3 py-2 border border-border-default rounded-md text-sm bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 font-[inherit] text-text-primary box-border"
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted text-base">×</button>}
          </div>
          <button className="md:hidden flex-shrink-0 px-3 py-2 border border-border-default rounded-xl text-xs font-medium text-text-secondary bg-surface-card cursor-pointer whitespace-nowrap font-[inherit]" onClick={cycleQuoteSort}>
            {mobileSortLabel}
          </button>
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
          <EmptyState icon="invoices" title="No quotes yet" description="Quotes let you price work before starting. Accept one and we'll convert it to an invoice automatically."
            action={<button onClick={() => router.push('/quotes/new')} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Create a quote</button>} />
        ) : (
          <div className="hidden md:block bg-surface-card rounded-xl border border-border-default">
            <table className="w-full border-separate border-spacing-0">
              <colgroup>
                <col className="w-10" />
                <col className="w-36" />
                <col />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-10" />
              </colgroup>
              <thead>
                <tr>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tl-xl">
                    <button onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(q => q.id)))}
                      className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                      {allSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                    onClick={() => toggleQuoteSort('quote_number')}>
                    Quote #{sortField === 'quote_number' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Client</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                    onClick={() => toggleQuoteSort('issue_date')}>
                    Issued{sortField === 'issue_date' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                    onClick={() => toggleQuoteSort('expiry_date')}>
                    Valid until{sortField === 'expiry_date' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                    onClick={() => toggleQuoteSort('total')}>
                    Amount{sortField === 'total' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Status</th>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 bg-surface-sunken rounded animate-pulse w-20" /></td>)}</tr>
                )) : sorted.map(q => {
                  const expired  = q.status === 'sent' && isQuoteExpired(q.expiry_date)
                  const days     = daysUntilExpiry(q.expiry_date)
                  const isSelected = selected.has(q.id)
                  return (
                    <tr key={q.id} className={cn('border-t border-border-subtle hover:bg-surface-sunken transition-colors', isSelected && 'bg-surface-sunken')}>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => toggleSelect(q.id)} className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                          {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-sm">
                        <Link href={`/quotes/${q.id}`} className="text-forest-600 hover:underline">{q.quote_number}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary">{q.clients?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums">{new Date(q.issue_date).toLocaleDateString('en-GB')}</td>
                      <td className={`px-4 py-2.5 text-sm tabular-nums ${expired ? 'text-danger-600' : days <= 3 && days >= 0 && q.status === 'sent' ? 'text-warning-600' : 'text-text-secondary'}`}>
                        {new Date(q.expiry_date).toLocaleDateString('en-GB')}
                        {expired && <span className="ml-1.5 text-caption font-medium">expired</span>}
                        {!expired && days <= 3 && days >= 0 && q.status === 'sent' && <span className="ml-1.5 text-caption font-medium">{days}d left</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-sm text-text-primary tabular-nums">{formatCurrency(q.total)}</td>
                      <td className="px-4 py-2.5"><Badge status={q.status} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <KebabMenu quote={q} onDelete={setDeleteTarget}
                          onStatusChange={(q, status) => setStatusTarget({ quote: q, status })} />
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
            <div key={i} className="bg-surface-card rounded-xl border border-border-default p-4">
              <div className="h-4 fd-skeleton w-24 mb-3" /><div className="h-3 fd-skeleton w-32" />
            </div>
          )) : sorted.map(q => {
            const expired = q.status === 'sent' && isQuoteExpired(q.expiry_date)
            const days = daysUntilExpiry(q.expiry_date)
            const isSelected = selected.has(q.id)
            return (
              <div key={q.id} className={`bg-surface-card rounded-xl border p-4 ${isSelected ? 'border-forest-300 bg-forest-50/30' : 'border-border-default'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(q.id)} aria-label={isSelected ? 'Deselect quote' : 'Select quote'} className="flex items-center flex-shrink-0">
                      {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4 text-text-secondary" />}
                    </button>
                    <Link href={`/quotes/${q.id}`} className="font-medium text-forest-700 hover:underline truncate">{q.quote_number}</Link>
                  </div>
                  <span className="font-semibold text-text-primary flex-shrink-0">{formatCurrency(q.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-text-primary truncate">{q.clients?.name ?? '—'}</span>
                  <div className="flex-shrink-0"><Badge status={q.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-7">
                  <span className={`text-xs ${expired ? 'text-danger-700 font-medium' : !expired && days <= 3 && days >= 0 && q.status === 'sent' ? 'text-warning-700 font-medium' : 'text-text-primary'}`}>
                    Valid until {new Date(q.expiry_date).toLocaleDateString('en-GB')}
                    {expired && ' · expired'}
                    {!expired && days <= 3 && days >= 0 && q.status === 'sent' && ` · ${days}d left`}
                  </span>
                  <KebabMenu quote={q} onDelete={setDeleteTarget}
                    onStatusChange={(q, status) => setStatusTarget({ quote: q, status })} />
                </div>
              </div>
            )
          })}
        </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete quote?"
          description={`${deleteTarget.quote_number} will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      {bulkDeleteOpen && (
        <ConfirmDeleteModal
          title={selected.size > 1 ? `Delete ${selected.size} quotes?` : 'Delete quote?'}
          description={`${selected.size} quote${selected.size !== 1 ? 's' : ''} will be permanently removed.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkDeleting}
        />
      )}
      {statusTarget && <StatusModal count={1} newStatus={statusTarget.status} onConfirm={handleStatusChange} onCancel={() => setStatusTarget(null)} loading={statusUpdating} />}
      {bulkStatusTarget && <StatusModal count={selected.size} newStatus={bulkStatusTarget} onConfirm={handleBulkStatus} onCancel={() => setBulkStatusTarget(null)} loading={statusUpdating} />}
    </div>
  )
}
