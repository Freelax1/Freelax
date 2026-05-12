'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchQuotes, deleteQuote } from '@/lib/api/quotes'
import { isQuoteExpired, daysUntilExpiry } from '@/lib/logic/quotes'
import PageHeader from '@/components/page-header'
import Link from 'next/link'
import {
  MoreVertical, Eye, Pencil, Trash2, CheckSquare, Square,
  Search, X, Plus, FileText, Send, CheckCircle2, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import type { Quote } from '@/types/database'

// ── Status badge — ct-badge with data-tone ───────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; tone: string }> = {
    draft:    { label: 'Draft',    tone: 'neutral' },
    sent:     { label: 'Sent',     tone: 'info'    },
    accepted: { label: 'Accepted', tone: 'success' },
    declined: { label: 'Declined', tone: 'danger'  },
    expired:  { label: 'Expired',  tone: 'warn'    },
  }
  const c = cfg[status] ?? { label: status, tone: 'neutral' }
  return (
    <span className="ct-badge" data-tone={c.tone}>
      <span className="ct-badge-dot" />
      {c.label}
    </span>
  )
}

// ── Delete modal ─────────────────────────────────────────────────────
function DeleteModal({ quoteNumber, count, onConfirm, onCancel, loading }: {
  quoteNumber: string; count?: number; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(20,23,29,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        className="ct-panel"
        style={{ width: '100%', maxWidth: 400, padding: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--ct-danger-soft)',
            border: '1px solid var(--ct-danger-line)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Trash2 style={{ width: 18, height: 18, color: 'var(--ct-danger)' }} strokeWidth={1.75} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ct-ink)', letterSpacing: '-0.01em' }}>
              {count && count > 1 ? `Delete ${count} quotes?` : 'Delete quote?'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ct-ink-3)' }}>
              {count && count > 1 ? `${count} quotes` : quoteNumber} will be permanently removed.
            </p>
          </div>
        </div>
        <p style={{ margin: '12px 0 20px', fontSize: 13, color: 'var(--ct-ink-3)' }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="ct-btn" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="ct-btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: 'var(--ct-danger)', color: '#fff', borderColor: 'var(--ct-danger)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status modal ─────────────────────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const cfg: Record<string, { label: string; tone: string; color: string }> = {
    draft:    { label: 'Draft',    tone: 'neutral', color: 'var(--ct-ink-2)'  },
    sent:     { label: 'Sent',     tone: 'info',    color: 'var(--ct-info)'    },
    accepted: { label: 'Accepted', tone: 'success', color: 'var(--ct-success)' },
    declined: { label: 'Declined', tone: 'danger',  color: 'var(--ct-danger)'  },
  }
  const c = cfg[newStatus] ?? cfg.draft
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(20,23,29,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div className="ct-panel" style={{ width: '100%', maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ct-ink)', letterSpacing: '-0.01em' }}>
          Mark as <span style={{ color: c.color }}>{c.label}</span>?
        </h2>
        <p style={{ margin: '6px 0 20px', fontSize: 13, color: 'var(--ct-ink-3)' }}>
          {count} quote{count !== 1 ? 's' : ''} will be marked as <span style={{ fontWeight: 600, color: c.color }}>{c.label}</span>.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="ct-btn" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="ct-btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: c.color, color: '#fff', borderColor: c.color,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Updating…' : `Mark as ${c.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Kebab menu ───────────────────────────────────────────────────────
function KebabMenu({ quote, onDelete, onStatusChange }: {
  quote: Quote
  onDelete: (q: Quote) => void
  onStatusChange: (q: Quote, status: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const isDraft = quote.status === 'draft'
  const allStatuses = [
    { key: 'draft',    label: 'Draft',    color: 'var(--ct-ink-3)'   },
    { key: 'sent',     label: 'Sent',     color: 'var(--ct-info)'    },
    { key: 'accepted', label: 'Accepted', color: 'var(--ct-success)' },
    { key: 'declined', label: 'Declined', color: 'var(--ct-danger)'  },
  ]
  const statusOptions = allStatuses.filter(s => s.key !== quote.status)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="ct-iconbtn"
        style={{ width: 28, height: 28 }}
        aria-label="More actions"
        type="button"
      >
        <MoreVertical style={{ width: 14, height: 14 }} strokeWidth={1.75} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 4px)',
            minWidth: 172, zIndex: 50, overflow: 'hidden',
            background: 'var(--ct-surface)',
            border: '1px solid var(--ct-line)',
            borderRadius: 'var(--ct-r-md)',
            boxShadow: 'var(--ct-shadow-2)',
            padding: 4,
          }}
        >
          <Link
            href={`/quotes/${quote.id}`}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 6,
              fontSize: 13, color: 'var(--ct-ink-2)', textDecoration: 'none',
            }}
          >
            <Eye style={{ width: 13, height: 13, color: 'var(--ct-ink-3)' }} strokeWidth={1.75} /> View
          </Link>
          {isDraft && (
            <Link
              href={`/quotes/${quote.id}/edit`}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6,
                fontSize: 13, color: 'var(--ct-ink-2)', textDecoration: 'none',
              }}
            >
              <Pencil style={{ width: 13, height: 13, color: 'var(--ct-ink-3)' }} strokeWidth={1.75} /> Edit
            </Link>
          )}
          <div style={{ borderTop: '1px solid var(--ct-line)', margin: '4px 0', padding: '4px 0' }}>
            <p style={{
              margin: 0, padding: '4px 10px 6px',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: 'var(--ct-ink-4)',
            }}>Change status</p>
            {statusOptions.map(s => (
              <button
                key={s.key}
                onClick={() => { setOpen(false); onStatusChange(quote, s.key) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 6,
                  fontSize: 13, color: 'var(--ct-ink-2)', background: 'none', border: 'none',
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--ct-line)' }}>
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onDelete(quote) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6,
                fontSize: 13, color: 'var(--ct-danger)', background: 'none', border: 'none',
                width: '100%', textAlign: 'left', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Trash2 style={{ width: 13, height: 13 }} strokeWidth={1.75} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bulk bar ─────────────────────────────────────────────────────────
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
    { key: 'sent',     label: 'Mark as Sent'     },
    { key: 'accepted', label: 'Mark as Accepted' },
    { key: 'declined', label: 'Mark as Declined' },
  ].filter(s => !allAre(s.key))

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--ct-ink)',
      borderRadius: 'var(--ct-r-md)',
      padding: '10px 14px',
      marginBottom: 12,
      boxShadow: 'var(--ct-shadow-2)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginRight: 4 }}>{count} selected</span>
      {statusOptions.length > 0 && (
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      )}
      {statusOptions.map(s => (
        <button
          key={s.key}
          onClick={() => onStatusChange(s.key)}
          style={{
            fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', cursor: 'pointer', transition: 'background 120ms',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          {s.label}
        </button>
      ))}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      <button
        onClick={onDelete}
        style={{
          fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 6,
          background: 'rgba(184,65,58,0.25)', border: '1px solid rgba(184,65,58,0.45)',
          color: '#FF8A80', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,65,58,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(184,65,58,0.25)')}
      >
        <Trash2 style={{ width: 12, height: 12 }} strokeWidth={1.75} /> Delete
      </button>
      <button
        onClick={onClear}
        style={{
          marginLeft: 'auto', fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Clear
      </button>
    </div>
  )
}

// ── Sort indicator ───────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown style={{ width: 11, height: 11, color: 'var(--ct-ink-4)', marginLeft: 4 }} strokeWidth={1.75} />
  return dir === 'asc'
    ? <ArrowUp   style={{ width: 11, height: 11, color: 'var(--ct-ink)', marginLeft: 4 }} strokeWidth={2} />
    : <ArrowDown style={{ width: 11, height: 11, color: 'var(--ct-ink)', marginLeft: 4 }} strokeWidth={2} />
}

type QuoteSortField = 'quote_number' | 'issue_date' | 'expiry_date' | 'total'
const QUOTE_SORT_OPTIONS: { label: string; field: QuoteSortField; dir: 'asc' | 'desc' }[] = [
  { label: 'Newest first', field: 'issue_date',  dir: 'desc' },
  { label: 'Oldest first', field: 'issue_date',  dir: 'asc'  },
  { label: 'Expiry date',  field: 'expiry_date', dir: 'asc'  },
  { label: 'Amount ↓',     field: 'total',       dir: 'desc' },
  { label: 'Amount ↑',     field: 'total',       dir: 'asc'  },
]

// ── Stat card ────────────────────────────────────────────────────────
function StatCard({ tone, label, count, total, active, onClick, Icon }: {
  tone: 'neutral' | 'info' | 'success' | 'warn'
  label: string
  count: number
  total: number
  active: boolean
  onClick: () => void
  Icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>
}) {
  const ref = useRef<HTMLButtonElement>(null)
  function handleMove(e: React.MouseEvent<HTMLButtonElement>) {
    const el = ref.current; if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }
  return (
    <button
      ref={ref}
      type="button"
      className="ct-stat"
      data-tone={tone}
      data-active={active ? 'true' : undefined}
      onClick={onClick}
      onMouseMove={handleMove}
    >
      <span className="ct-stat-rail" aria-hidden />
      <span className="ct-stat-glow" aria-hidden />
      <div className="ct-stat-head">
        <span className="ct-stat-label">{label}</span>
        <span className="ct-stat-icon"><Icon style={{ width: 12, height: 12 }} strokeWidth={1.75} /></span>
      </div>
      <p className="ct-stat-value">{count}</p>
      <p className="ct-stat-foot">
        <span className="ct-stat-dot" aria-hidden />
        <span className="ct-stat-sub">{formatCurrency(total)}</span>
      </p>
    </button>
  )
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes]                 = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [deleteTarget, setDeleteTarget]     = useState<any | null>(null)
  const [deleting, setDeleting]             = useState(false)
  const [statusFilter, setStatusFilter]     = useState<string>('all')
  const [query, setQuery]                   = useState('')
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting]     = useState(false)
  const [statusTarget, setStatusTarget]     = useState<{ quote: Quote; status: string } | null>(null)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [sortField, setSortField]           = useState<QuoteSortField>('issue_date')
  const [sortDir, setSortDir]               = useState<'desc' | 'asc'>('desc')
  const [hoverRow, setHoverRow]             = useState<string | null>(null)

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

  const totals = {
    draft:    quotes.filter(q => q.status === 'draft').reduce((s, q) => s + Number(q.total), 0),
    sent:     quotes.filter(q => q.status === 'sent').reduce((s, q) => s + Number(q.total), 0),
    accepted: quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + Number(q.total), 0),
    expired:  quotes.filter(q => q.status === 'sent' && isQuoteExpired(q.expiry_date)).reduce((s, q) => s + Number(q.total), 0),
  }

  const hasMatches    = sorted.length > 0
  const noQuotesAtAll = !loading && quotes.length === 0
  const noMatches     = !loading && quotes.length > 0 && !hasMatches

  return (
    <div>
      <PageHeader
        className="fd-page-enter"
        title="Quotes"
        subtitle={loading ? '' : `${quotes.length} quotes`}
        action={
          <button
            onClick={() => router.push('/quotes/new')}
            className="ct-btn ct-btn-primary"
            type="button"
          >
            <Plus style={{ width: 14, height: 14 }} strokeWidth={2.25} />
            <span>New quote</span>
          </button>
        }
      />

      {/* Stat row — clickable filters */}
      {!loading && quotes.length > 0 && (
        <div className="ct-stat-row fd-page-enter" style={{ marginBottom: 16 }}>
          <StatCard tone="neutral" label="Draft"    count={stats.draft}    total={totals.draft}    active={statusFilter === 'draft'}    onClick={() => setStatusFilter(statusFilter === 'draft'    ? 'all' : 'draft')}    Icon={FileText} />
          <StatCard tone="info"    label="Sent"     count={stats.sent}     total={totals.sent}     active={statusFilter === 'sent'}     onClick={() => setStatusFilter(statusFilter === 'sent'     ? 'all' : 'sent')}     Icon={Send} />
          <StatCard tone="success" label="Accepted" count={stats.accepted} total={totals.accepted} active={statusFilter === 'accepted'} onClick={() => setStatusFilter(statusFilter === 'accepted' ? 'all' : 'accepted')} Icon={CheckCircle2} />
          <StatCard tone="warn"    label="Expired"  count={stats.expired}  total={totals.expired}  active={statusFilter === 'expired'}  onClick={() => setStatusFilter(statusFilter === 'expired'  ? 'all' : 'expired')}  Icon={AlertTriangle} />
        </div>
      )}

      {/* Search + mobile sort */}
      {!loading && quotes.length > 0 && (
        <div className="fd-page-enter" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="ct-search" style={{ flex: 1, maxWidth: 360 }}>
            <Search className="ct-search-icon" style={{ width: 14, height: 14 }} strokeWidth={1.75} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search quotes…"
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="ct-search-clear"
                aria-label="Clear search"
                type="button"
              >
                <X style={{ width: 12, height: 12 }} strokeWidth={2} />
              </button>
            )}
          </div>
          <button
            className="ct-btn ct-btn-sm md:hidden"
            onClick={cycleQuoteSort}
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            type="button"
          >
            {mobileSortLabel}
          </button>
        </div>
      )}

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

      {/* Empty — no quotes at all */}
      {noQuotesAtAll && (
        <div className="ct-empty fd-page-enter">
          <div className="ct-empty-icon">
            <FileText style={{ width: 22, height: 22 }} strokeWidth={1.5} />
          </div>
          <h3 className="ct-empty-title">No quotes yet</h3>
          <p className="ct-empty-sub">Quotes let you price work before starting. Accept one and we'll convert it to an invoice automatically.</p>
          <button
            onClick={() => router.push('/quotes/new')}
            className="ct-btn ct-btn-primary"
            type="button"
            style={{ marginTop: 14 }}
          >
            <Plus style={{ width: 14, height: 14 }} strokeWidth={2.25} />
            <span>Create a quote</span>
          </button>
        </div>
      )}

      {/* Empty — filter/search hides everything */}
      {noMatches && (
        <div className="ct-empty fd-page-enter">
          <div className="ct-empty-icon">
            <Search style={{ width: 22, height: 22 }} strokeWidth={1.5} />
          </div>
          <h3 className="ct-empty-title">No matches</h3>
          <p className="ct-empty-sub">No quotes match your current filter or search.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="ct-btn ct-btn-sm" type="button">
                Clear filter
              </button>
            )}
            {query && (
              <button onClick={() => setQuery('')} className="ct-btn ct-btn-sm" type="button">
                Clear search
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop table */}
      {!noQuotesAtAll && !noMatches && (
        <div className="fd-page-enter">
          <div className="ct-table-wrap hidden md:block">
            <table className="ct-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <button
                      onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(q => q.id)))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ct-ink-3)', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      type="button"
                      aria-label={allSelected ? 'Clear selection' : 'Select all'}
                    >
                      {allSelected
                        ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--ct-ink)' }} strokeWidth={1.75} />
                        : <Square      style={{ width: 15, height: 15 }} strokeWidth={1.75} />}
                    </button>
                  </th>
                  <th
                    onClick={() => toggleQuoteSort('quote_number')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Quote #<SortIcon active={sortField === 'quote_number'} dir={sortDir} />
                    </span>
                  </th>
                  <th>Client</th>
                  <th
                    onClick={() => toggleQuoteSort('issue_date')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Issued<SortIcon active={sortField === 'issue_date'} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleQuoteSort('expiry_date')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      Valid until<SortIcon active={sortField === 'expiry_date'} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    onClick={() => toggleQuoteSort('total')}
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      Total<SortIcon active={sortField === 'total'} dir={sortDir} />
                    </span>
                  </th>
                  <th>Status</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map(q => {
                  const expired    = q.status === 'sent' && isQuoteExpired(q.expiry_date)
                  const days       = daysUntilExpiry(q.expiry_date)
                  const isSelected = selected.has(q.id)
                  const dateTone   = expired ? 'var(--ct-danger)' : (days <= 3 && days >= 0 && q.status === 'sent') ? 'var(--ct-warn)' : 'var(--ct-ink-3)'
                  const dateWeight = expired || (days <= 3 && days >= 0 && q.status === 'sent') ? 600 : 400
                  return (
                    <tr
                      key={q.id}
                      className="ct-tr"
                      data-selected={isSelected ? 'true' : undefined}
                      data-tone={isSelected ? 'info' : undefined}
                      onMouseEnter={() => setHoverRow(q.id)}
                      onMouseLeave={() => setHoverRow(prev => prev === q.id ? null : prev)}
                    >
                      <td>
                        <button
                          onClick={() => toggleSelect(q.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: isSelected ? 'var(--ct-ink)' : 'var(--ct-ink-3)', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          type="button"
                          aria-label={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected
                            ? <CheckSquare style={{ width: 15, height: 15 }} strokeWidth={1.75} />
                            : <Square      style={{ width: 15, height: 15 }} strokeWidth={1.75} />}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <Link
                          href={`/quotes/${q.id}`}
                          style={{ color: 'var(--ct-info)', textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {q.quote_number}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--ct-ink-2)' }}>{q.clients?.name ?? '—'}</td>
                      <td style={{ color: 'var(--ct-ink-3)' }}>{new Date(q.issue_date).toLocaleDateString('en-GB')}</td>
                      <td style={{ color: dateTone, fontWeight: dateWeight }}>
                        {new Date(q.expiry_date).toLocaleDateString('en-GB')}
                        {expired && <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 500 }}>(expired)</span>}
                        {!expired && days <= 3 && days >= 0 && q.status === 'sent' && (
                          <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 500 }}>({days}d left)</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ct-ink)' }}>
                        {formatCurrency(q.total)}
                      </td>
                      <td><StatusBadge status={expired ? 'expired' : q.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="ct-tr-actions" data-show={hoverRow === q.id ? 'true' : undefined}>
                          <KebabMenu
                            quote={q}
                            onDelete={setDeleteTarget}
                            onStatusChange={(quote, status) => setStatusTarget({ quote, status })}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skl-${i}`} className="ct-tr">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}>
                        <div style={{ height: 14, background: 'rgba(20,23,29,0.05)', borderRadius: 4, width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="ct-panel" style={{ padding: 14 }}>
                    <div style={{ height: 14, width: 96, background: 'rgba(20,23,29,0.05)', borderRadius: 4, marginBottom: 10 }} />
                    <div style={{ height: 12, width: 128, background: 'rgba(20,23,29,0.05)', borderRadius: 4 }} />
                  </div>
                ))
              : sorted.map(q => {
                  const expired = q.status === 'sent' && isQuoteExpired(q.expiry_date)
                  const days = daysUntilExpiry(q.expiry_date)
                  const isSelected = selected.has(q.id)
                  return (
                    <div
                      key={q.id}
                      className="ct-panel"
                      style={{
                        padding: 14,
                        borderColor: isSelected ? 'var(--ct-info-line)' : 'var(--ct-line)',
                        background: isSelected ? 'var(--ct-info-soft)' : 'var(--ct-surface)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <button
                            onClick={() => toggleSelect(q.id)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                            type="button"
                            aria-label={isSelected ? 'Deselect' : 'Select'}
                          >
                            {isSelected
                              ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--ct-ink)' }} strokeWidth={1.75} />
                              : <Square      style={{ width: 15, height: 15, color: 'var(--ct-ink-3)' }} strokeWidth={1.75} />}
                          </button>
                          <Link
                            href={`/quotes/${q.id}`}
                            style={{
                              fontWeight: 600, color: 'var(--ct-info)',
                              textDecoration: 'none', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {q.quote_number}
                          </Link>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--ct-ink)', flexShrink: 0 }}>{formatCurrency(q.total)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6, paddingLeft: 25 }}>
                        <span style={{ fontSize: 13, color: 'var(--ct-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.clients?.name ?? '—'}
                        </span>
                        <div style={{ flexShrink: 0 }}><StatusBadge status={expired ? 'expired' : q.status} /></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingLeft: 25 }}>
                        <span style={{
                          fontSize: 11.5,
                          color: expired ? 'var(--ct-danger)' : (!expired && days <= 3 && days >= 0 && q.status === 'sent') ? 'var(--ct-warn)' : 'var(--ct-ink-4)',
                          fontWeight: expired || (!expired && days <= 3 && days >= 0 && q.status === 'sent') ? 600 : 400,
                        }}>
                          Valid until {new Date(q.expiry_date).toLocaleDateString('en-GB')}
                          {expired && ' · expired'}
                          {!expired && days <= 3 && days >= 0 && q.status === 'sent' && ` · ${days}d left`}
                        </span>
                        <KebabMenu
                          quote={q}
                          onDelete={setDeleteTarget}
                          onStatusChange={(quote, status) => setStatusTarget({ quote, status })}
                        />
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      )}

      {deleteTarget    && <DeleteModal quoteNumber={deleteTarget.quote_number} onConfirm={handleDelete}      onCancel={() => setDeleteTarget(null)}     loading={deleting} />}
      {bulkDeleteOpen  && <DeleteModal quoteNumber=""                          count={selected.size}          onConfirm={handleBulkDelete}  onCancel={() => setBulkDeleteOpen(false)}  loading={bulkDeleting} />}
      {statusTarget    && <StatusModal count={1}              newStatus={statusTarget.status}     onConfirm={handleStatusChange} onCancel={() => setStatusTarget(null)}     loading={statusUpdating} />}
      {bulkStatusTarget && <StatusModal count={selected.size} newStatus={bulkStatusTarget}        onConfirm={handleBulkStatus}   onCancel={() => setBulkStatusTarget(null)} loading={statusUpdating} />}
    </div>
  )
}
