'use client'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchInvoices, deleteInvoice } from '@/lib/api/invoices'
import { calcDaysOverdue, isPastDue } from '@/lib/logic/invoices'
import PageHeader from '@/components/page-header'
import EmptyState from '@/components/empty-state'
import Badge from '@/components/badge'
import Link from 'next/link'
import { DotsThreeVertical, Eye, PencilSimple, Trash, Envelope } from '@phosphor-icons/react'
import type { Invoice } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import Tooltip from '@/components/tooltip'

// ── Status modal ──────────────────────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const STATUS_LABELS: Record<string, string> = {
    sent: 'Sent', paid: 'Paid', cancelled: 'Cancelled', draft: 'Draft',
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
          {count} invoice{count !== 1 ? 's' : ''} will be marked as <span style={{ fontWeight: 600, color }}>{label}</span>.
          {newStatus === 'paid' && <span className="block mt-1 text-warning-800 text-xs">Paid date will be set to today for any unpaid invoices.</span>}
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
function KebabMenu({ invoice, onDelete, onStatusChange, onSendByEmail }: {
  invoice: Invoice; onDelete: (inv: Invoice) => void
  onStatusChange: (inv: Invoice, status: string) => void; onSendByEmail: (inv: Invoice) => void
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

  const isDraft = invoice.status === 'draft'
  const isPaid  = invoice.status === 'paid'

  // Status options — never show paid for already-paid invoices
  const allStatuses = [
    { key: 'sent',      label: 'Mark as Sent' },
    { key: 'paid',      label: 'Paid'         },
    { key: 'cancelled', label: 'Cancelled'    },
    { key: 'draft',     label: 'Draft'        },
  ]
  const statusOptions = allStatuses.filter(s => {
    if (s.key === invoice.status) return false   // hide current status
    if (isPaid && s.key === 'paid') return false  // never re-mark paid
    // A sent or overdue invoice has already left the building — draft makes no sense
    if ((invoice.status === 'sent' || invoice.status === 'overdue') && s.key === 'draft') return false
    return true
  })

  return (
    <div ref={ref} className="relative">
      <Tooltip label="Invoice actions">
        <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          className="p-1.5 rounded-xl hover:bg-surface-sunken text-text-secondary hover:text-text-primary transition-colors">
          <DotsThreeVertical weight="regular" className="w-4 h-4" />
        </button>
      </Tooltip>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] bg-surface-card border border-border-default rounded-xl z-50 min-w-[160px] overflow-hidden shadow-popover">
          <Link href={`/invoices/${invoice.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken">
            <Eye weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> View
          </Link>
          {isDraft && (
            <Link href={`/invoices/${invoice.id}/edit`} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken">
              <PencilSimple weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> Edit
            </Link>
          )}
          {/* Status options */}
          {statusOptions.length > 0 && (
            <div className="border-t border-border-subtle">
              <p className="text-micro font-semibold text-text-muted px-4 pt-2.5 pb-1 text-left">Change status</p>
              {statusOptions.map(s => (
                <button key={s.key} onClick={() => { setOpen(false); onStatusChange(invoice, s.key) }}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-text-primary hover:bg-surface-sunken w-full text-left border-none cursor-pointer bg-transparent"
                >
                  <span className="inline-block w-[7px] h-[7px] rounded-full shrink-0" style={{ background: tonePalette(s.key).dot }} />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {invoice.status !== 'sent' && invoice.status !== 'paid' && (
            <div className="border-t border-border-subtle">
              <button onClick={e => { e.stopPropagation(); setOpen(false); onSendByEmail(invoice) }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken w-full text-left">
                <Envelope weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> Send by email
              </button>
            </div>
          )}

          <div className="border-t border-border-subtle">
            <button onClick={e => { e.stopPropagation(); setOpen(false); onDelete(invoice) }}
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
function BulkBar({ count, unpaidCount, onMarkPaid, onDelete, onClear, marking, deleting }: {
  count: number; unpaidCount: number
  onMarkPaid: () => void; onDelete: () => void; onClear: () => void
  marking: boolean; deleting: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 bg-forest-950 rounded-lg px-4 py-2.5 mb-3">
      <span className="text-sm font-medium text-white mr-1">{count} selected</span>
      <div className="w-px h-4 bg-white/15" />
      {unpaidCount > 0 && (
        <button onClick={onMarkPaid} disabled={marking}
          className={cn('text-xs font-medium px-2.5 py-1 rounded-md text-success-300 bg-success-800/30 border border-success-700/50', marking ? 'cursor-default opacity-60' : 'cursor-pointer')}
        >
          {marking ? 'Marking…' : `Mark ${unpaidCount} as paid`}
        </button>
      )}
      <button onClick={onDelete} disabled={deleting}
        className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md text-danger-300 bg-danger-800/30 border border-danger-700/50', deleting ? 'cursor-default' : 'cursor-pointer')}
      >
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </button>
      <button onClick={onClear} className="ml-auto text-xs cursor-pointer bg-transparent border-none text-white/70">Clear</button>
    </div>
  )
}

type InvSortField = 'invoice_number' | 'issue_date' | 'due_date' | 'total'
const INV_SORT_OPTIONS: { label: string; field: InvSortField; dir: 'asc' | 'desc' }[] = [
  { label: 'Newest first', field: 'issue_date', dir: 'desc' },
  { label: 'Oldest first', field: 'issue_date', dir: 'asc' },
  { label: 'Due date',     field: 'due_date',   dir: 'asc' },
  { label: 'Amount ↓',    field: 'total',       dir: 'desc' },
  { label: 'Amount ↑',    field: 'total',       dir: 'asc' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices]         = useState<Invoice[]>([])
  const [loading, setLoading]           = useState(true)
  const [updating, setUpdating]         = useState(false)
  const [msg, setMsg]                   = useState<string | null>(null)
  const [query, setQuery]               = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleting, setDeleting]         = useState(false)
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkMarking, setBulkMarking]   = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<{ invoice: Invoice; status: string } | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [sortField, setSortField] = useState<InvSortField>('issue_date')
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc')

  async function load() { setInvoices(await fetchInvoices()); setLoading(false) }
  useEffect(() => { load() }, [])

  const { pendingIds: deletePending, scheduleDelete } = useUndoDelete(
    async (inv: Invoice) => deleteInvoice(inv.id),
    (inv: Invoice) => String(inv.invoice_number),
    load,
  )

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map(id => deleteInvoice(id)))
      setSelected(new Set()); setBulkDeleteOpen(false); setBulkDeleting(false); load()
    } catch { setBulkDeleting(false) }
  }

  // Only mark invoices that aren't already paid
  async function handleBulkMarkPaid() {
    const unpaidIds = Array.from(selected).filter(id => {
      const inv = invoices.find(i => i.id === id)
      return inv && inv.status !== 'paid'
    })
    if (!unpaidIds.length) return
    setBulkMarking(true)
    await Promise.all(unpaidIds.map(id =>
      fetch('/api/invoices/mark-paid', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: id }),
      })
    ))
    setSelected(new Set()); setBulkMarking(false)
    window.dispatchEvent(new Event('fd:data-invalidate'))
    load()
  }

  async function handleStatusChange() {
    if (!statusTarget) return
    const wasSent = statusTarget.status === 'sent'
    setStatusUpdating(true)
    try {
      if (statusTarget.status === 'paid') {
        await fetch('/api/invoices/mark-paid', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: statusTarget.invoice.id }),
        })
      } else {
        await fetch('/api/invoices/update-status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceId: statusTarget.invoice.id, status: statusTarget.status }),
        })
      }
      setStatusTarget(null); setStatusUpdating(false); load()
      if (wasSent) {
        setMsg('Marked as sent — no email was dispatched. Use Send by email to notify the client.')
        setTimeout(() => setMsg(null), 5000)
      }
    } catch { setStatusUpdating(false) }
  }

  async function handleSendByEmail(inv: Invoice) {
    try {
      await fetch('/api/invoices/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv.id }),
      })
      setMsg('Invoice sent by email.')
      setTimeout(() => setMsg(null), 5000)
      load()
    } catch (e) { console.error('Send by email failed', e) }
  }

  async function handleUpdateOverdue() {
    setUpdating(true)
    const res = await fetch('/api/invoices/update-overdue', { method: 'POST' })
    const data = await res.json()
    setUpdating(false)
    if (data.updated > 0) { setMsg(`${data.updated} invoice${data.updated > 1 ? 's' : ''} marked as overdue`); load() }
    else setMsg('No overdue invoices found')
    setTimeout(() => setMsg(null), 3000)
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((i: Invoice) => i.id)))
  }

  const today = new Date().toISOString().slice(0, 10)

  const filtered = invoices.filter(i => {
    const q = query.trim().toLowerCase()
    const matchesQuery = q.length === 0 || (
      i.invoice_number.toLowerCase().includes(q) ||
      (i.clients?.name ?? '').toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q) ||
      String(i.total).includes(q) ||
      new Date(i.due_date).toLocaleDateString('en-GB').includes(q) ||
      new Date(i.issue_date).toLocaleDateString('en-GB').includes(q)
    )
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
    return matchesQuery && matchesStatus && !deletePending.has(i.id)
  })

  function toggleInvSort(field: InvSortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }
  const mobileSortIdx = INV_SORT_OPTIONS.findIndex(o => o.field === sortField && o.dir === sortDir)
  const mobileSortLabel = mobileSortIdx >= 0 ? INV_SORT_OPTIONS[mobileSortIdx].label : (sortDir === 'asc' ? '↑' : '↓')
  function cycleInvSort() {
    const next = INV_SORT_OPTIONS[(mobileSortIdx >= 0 ? mobileSortIdx + 1 : 1) % INV_SORT_OPTIONS.length]
    setSortField(next.field); setSortDir(next.dir)
  }
  const sorted = [...filtered].sort((a, b) => {
    const av = sortField === 'total' ? Number(a.total) : String(a[sortField] ?? '')
    const bv = sortField === 'total' ? Number(b.total) : String(b[sortField] ?? '')
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const groupedByMonth = sorted.reduce<{ label: string; items: typeof sorted }[]>((acc, inv) => {
    const label = new Date(inv.issue_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const last = acc[acc.length - 1]
    if (last?.label === label) last.items.push(inv)
    else acc.push({ label, items: [inv] })
    return acc
  }, [])

  const overdueCount = invoices.filter(i => i.status === 'sent' && i.due_date < today).length
  const unpaidSelectedCount = Array.from(selected).filter(id => {
    const inv = invoices.find(i => i.id === id)
    return inv && inv.status !== 'paid'
  }).length
  const paidSelectedCount = Array.from(selected).filter(id => {
    const inv = invoices.find(i => i.id === id)
    return inv && inv.status === 'paid'
  }).length

  const stats = {
    draft:   { count: 0, total: 0 },
    sent:    { count: 0, total: 0 },
    overdue: { count: 0, total: 0 },
    paid:    { count: 0, total: 0 },
  }
  invoices.forEach(i => {
    if (i.status in stats) {
      stats[i.status as keyof typeof stats].count++
      stats[i.status as keyof typeof stats].total += Number(i.total)
    }
  })

  return (
    <div>
      <PageHeader className="fd-page-enter"
        title="Invoices"
        subtitle={loading ? '' : `${invoices.length} invoices`}
        action={
          <div className="flex gap-2">
            {overdueCount > 0 && (
              <button onClick={handleUpdateOverdue} disabled={updating}
                className="px-3 py-2 bg-danger-50 border border-danger-200 text-danger-700 rounded-xl text-sm font-medium hover:bg-danger-100 disabled:opacity-50">
                {updating ? 'Updating...' : `Mark ${overdueCount} overdue`}
              </button>
            )}
            <Link href="/invoices/new" className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">
              New invoice
            </Link>
          </div>
        }
      />

      {msg && <div className="fd-page-enter mb-4 bg-warning-50 border border-warning-200 text-warning-800 text-sm px-4 py-2.5 rounded-xl">{msg}</div>}

      {/* Status cards */}
      {!loading && invoices.length > 0 && (
        <div className="fd-stat-grid fd-page-enter">
          {(['draft', 'sent', 'overdue', 'paid'] as const).map(key => {
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
                <p className="text-xl font-semibold tracking-tight mb-px" style={{ color: isActive ? 'var(--text-on-dark)' : t.textValue }}>{stats[key].count}</p>
                <p className="text-caption font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : t.textValue }}>{formatCurrency(stats[key].total)}</p>
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
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoices..."
              className="w-full pl-9 pr-3 py-2 border border-border-default rounded-md text-sm bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 font-[inherit] text-text-primary box-border"
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted text-base">×</button>}
          </div>
          <button className="md:hidden flex-shrink-0 px-3 py-2 border border-border-default rounded-xl text-xs font-medium text-text-secondary bg-surface-card cursor-pointer whitespace-nowrap font-[inherit]" onClick={cycleInvSort}>
            {mobileSortLabel}
          </button>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          unpaidCount={unpaidSelectedCount}
          onMarkPaid={handleBulkMarkPaid}
          onDelete={() => setBulkDeleteOpen(true)}
          onClear={() => setSelected(new Set())}
          marking={bulkMarking}
          deleting={bulkDeleting}
        />
      )}

      {!loading && !invoices.length ? (
        <EmptyState className="fd-page-enter" icon="invoice" title="No invoices yet" description="Invoices here will feed your tax estimates and chase overdue payments automatically. Send your first to get the dashboard working."
          action={<Link href="/invoices/new" className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Send your first invoice</Link>} />
      ) : (
        <div className="hidden md:block fd-page-enter bg-surface-card rounded-xl border border-border-default">
          <table className="w-full border-separate border-spacing-0">
            <colgroup>
              <col className="w-10" />
              <col className="w-36" />
              <col />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tl-xl">
                  <input type="checkbox"
                    aria-label="Select all invoices"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border-strong cursor-pointer"
                  />
                </th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                  onClick={() => toggleInvSort('invoice_number')}>
                  Invoice #{sortField === 'invoice_number' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Client</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                  onClick={() => toggleInvSort('issue_date')}>
                  Issued{sortField === 'issue_date' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                  onClick={() => toggleInvSort('due_date')}>
                  Due{sortField === 'due_date' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default select-none cursor-pointer"
                  onClick={() => toggleInvSort('total')}>
                  Amount{sortField === 'total' && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Status</th>
                <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-border-subtle">{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-3.5 fd-skeleton w-20" /></td>)}</tr>
              )) : groupedByMonth.flatMap(({ label, items }, groupIdx) => [
                <tr key={`hdr-${label}-${groupIdx}`}>
                  <td colSpan={8} className={`px-4 pb-1 ${groupIdx === 0 ? 'pt-2.5' : 'pt-3 border-t border-border-subtle'}`}>
                    <span className="text-micro font-semibold text-text-muted">{label}</span>
                  </td>
                </tr>,
                ...items.map(inv => {
                  const days = calcDaysOverdue(inv.due_date)
                  const pastDue = isPastDue(inv.status, inv.due_date, today)
                  return (
                    <tr key={inv.id} className={`border-t border-border-subtle hover:bg-surface-sunken transition-colors ${pastDue ? 'bg-danger-50/30' : ''} ${selected.has(inv.id) ? 'bg-forest-50/50' : ''}`}>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" aria-label={`Select invoice ${inv.invoice_number}`} checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="rounded border-border-strong cursor-pointer" />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-sm">
                        <Link href={`/invoices/${inv.id}`} className="text-forest-600 hover:underline">{inv.invoice_number}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary">{inv.clients?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                      <td className={`px-4 py-2.5 text-sm tabular-nums ${pastDue ? 'text-danger-600 font-medium' : 'text-text-secondary'}`}>
                        {new Date(inv.due_date).toLocaleDateString('en-GB')}
                        {pastDue && <span className="ml-1.5 text-caption font-medium">{days}d late</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-sm text-text-primary tabular-nums">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-2.5"><Badge status={inv.status} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <KebabMenu invoice={inv} onDelete={scheduleDelete}
                          onStatusChange={(inv, status) => setStatusTarget({ invoice: inv, status })}
                          onSendByEmail={handleSendByEmail} />
                      </td>
                    </tr>
                  )
                }),
              ])}
            </tbody>
          </table>
        </div>
      )}


        {/* Mobile cards — grouped by month */}
        <div className="md:hidden fd-page-enter space-y-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-card rounded-xl border border-border-default p-4">
              <div className="h-4 fd-skeleton w-24 mb-3" />
              <div className="h-3 fd-skeleton w-32 mb-2" />
              <div className="h-3 fd-skeleton w-20" />
            </div>
          )) : groupedByMonth.map(({ label, items }) => (
            <div key={label}>
              <p className="text-caption font-semibold text-text-muted mb-2 px-1">{label}</p>
              <div className="bg-surface-card rounded-xl border border-border-default overflow-hidden divide-y divide-border-subtle">
                {items.map(inv => {
                  const days = calcDaysOverdue(inv.due_date)
                  const pastDue = isPastDue(inv.status, inv.due_date, today)
                  const isSelected = selected.has(inv.id)
                  return (
                    <div key={inv.id} className={`p-4 transition-colors ${pastDue ? 'bg-danger-50/30' : ''} ${isSelected ? 'bg-forest-50/30' : ''}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input type="checkbox" aria-label={`Select invoice ${inv.invoice_number}`} checked={isSelected} onChange={() => toggleSelect(inv.id)}
                            onClick={e => e.stopPropagation()} className="rounded border-border-strong cursor-pointer flex-shrink-0" />
                          <Link href={`/invoices/${inv.id}`} className="font-medium text-forest-700 hover:underline truncate">
                            {inv.invoice_number}
                          </Link>
                        </div>
                        <span className="font-semibold text-text-primary flex-shrink-0">{formatCurrency(inv.total)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                        <span className="text-sm text-text-primary truncate">{inv.clients?.name ?? '—'}</span>
                        <div className="flex-shrink-0"><Badge status={inv.status} /></div>
                      </div>
                      <div className="flex items-center justify-between gap-3 pl-7">
                        <span className={`text-xs ${pastDue ? 'text-danger-700 font-medium' : 'text-text-primary'}`}>
                          Due {new Date(inv.due_date).toLocaleDateString('en-GB')}
                          {pastDue && ` · ${days}d late`}
                        </span>
                        <KebabMenu invoice={inv} onDelete={scheduleDelete}
                          onStatusChange={(inv, status) => setStatusTarget({ invoice: inv, status })}
                          onSendByEmail={handleSendByEmail} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

      {bulkDeleteOpen && (
        <ConfirmDeleteModal
          title={selected.size > 1 ? `Delete ${selected.size} invoices?` : 'Delete invoice?'}
          description={`${selected.size} invoice${selected.size !== 1 ? 's' : ''} will be permanently removed.`}
          warning={paidSelectedCount > 0 ? `⚠ ${paidSelectedCount} paid invoice${paidSelectedCount !== 1 ? 's' : ''} selected — deleting will remove them from your income totals.` : undefined}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkDeleting}
        />
      )}
      {statusTarget && <StatusModal count={1} newStatus={statusTarget.status} onConfirm={handleStatusChange} onCancel={() => setStatusTarget(null)} loading={statusUpdating} />}
    </div>
  )
}
