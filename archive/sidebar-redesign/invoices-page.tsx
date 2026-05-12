'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchInvoices, deleteInvoice } from '@/lib/api/invoices'
import { calcDaysOverdue, isPastDue } from '@/lib/logic/invoices'
import PageHeader from '@/components/page-header'
import EmptyState from '@/components/empty-state'
import Link from 'next/link'
import {
  MoreVertical, Eye, Pencil, Trash2, Mail,
  FileText, Send, AlertTriangle, CheckCircle2, Search, X,
} from 'lucide-react'
import type { Invoice } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'

// ───────────────────────────────────────────────────────────────────────
// Status badge — drop-in replacement using ct-badge
// ───────────────────────────────────────────────────────────────────────
type StatusKey = 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled'
const STATUS_TONE: Record<StatusKey, 'neutral' | 'info' | 'danger' | 'success' | 'warn'> = {
  draft:     'neutral',
  sent:      'info',
  overdue:   'danger',
  paid:      'success',
  cancelled: 'warn',
}
const STATUS_LABEL: Record<StatusKey, string> = {
  draft: 'Draft', sent: 'Sent', overdue: 'Overdue', paid: 'Paid', cancelled: 'Cancelled',
}
function StatusBadge({ status }: { status: string }) {
  const k = (status in STATUS_TONE ? status : 'neutral') as StatusKey
  return (
    <span className="ct-badge" data-tone={STATUS_TONE[k] ?? 'neutral'}>
      <span className="ct-badge-dot" />
      <span>{STATUS_LABEL[k] ?? status}</span>
    </span>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Delete confirmation modal — ct-panel chrome
// ───────────────────────────────────────────────────────────────────────
function DeleteModal({ invoiceNumber, count, paidCount, onConfirm, onCancel, loading }: {
  invoiceNumber: string; count?: number; paidCount?: number
  onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(20,23,29,0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="ct-panel"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, padding: 24, boxShadow: 'var(--ct-shadow-2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
          <span style={{
            display: 'inline-grid', placeItems: 'center',
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--ct-danger-soft)',
            border: '1px solid var(--ct-danger-line)',
            color: 'var(--ct-danger)', flexShrink: 0,
          }}>
            <Trash2 style={{ width: 18, height: 18 }} strokeWidth={1.75} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              margin: 0, fontSize: 16, fontWeight: 700,
              color: 'var(--ct-ink)', letterSpacing: '-0.01em',
            }}>
              {count && count > 1 ? `Delete ${count} invoices?` : 'Delete invoice?'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ct-ink-3)' }}>
              {count && count > 1 ? `${count} invoices` : invoiceNumber} will be permanently removed.
            </p>
          </div>
        </div>

        {paidCount && paidCount > 0 ? (
          <div style={{
            marginTop: 14,
            background: 'var(--ct-warn-soft)',
            border: '1px solid var(--ct-warn-line)',
            borderRadius: 'var(--ct-r-md)',
            padding: '10px 12px',
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ct-warn)' }}>
              ⚠ {paidCount} paid invoice{paidCount !== 1 ? 's' : ''} selected
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ct-warn)', opacity: 0.85 }}>
              Deleting paid invoices will permanently remove them from your income totals on the dashboard and tax pages.
            </p>
          </div>
        ) : null}

        <p style={{
          margin: '14px 0 18px', fontSize: 13, color: 'var(--ct-ink-3)',
        }}>This action cannot be undone.</p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="ct-btn" style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="ct-btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: 'var(--ct-danger)', color: '#fff', borderColor: 'var(--ct-danger)',
              opacity: loading ? 0.6 : 1, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Status change modal — ct-panel chrome + tone-mapped CTA
// ───────────────────────────────────────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string
  onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const cfg: Record<string, { label: string; tone: 'info' | 'success' | 'danger' | 'neutral'; color: string }> = {
    sent:      { label: 'Sent',      tone: 'info',    color: 'var(--ct-info)' },
    paid:      { label: 'Paid',      tone: 'success', color: 'var(--ct-success)' },
    cancelled: { label: 'Cancelled', tone: 'danger',  color: 'var(--ct-danger)' },
    draft:     { label: 'Draft',     tone: 'neutral', color: 'var(--ct-ink-3)' },
  }
  const { label, color } = cfg[newStatus] ?? { label: newStatus, tone: 'neutral' as const, color: 'var(--ct-ink-3)' }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(20,23,29,0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="ct-panel"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, padding: 24, boxShadow: 'var(--ct-shadow-2)' }}
      >
        <h2 style={{
          margin: 0, fontSize: 16, fontWeight: 700,
          color: 'var(--ct-ink)', letterSpacing: '-0.01em',
        }}>
          Mark as <span style={{ color }}>{label}</span>?
        </h2>
        <p style={{ margin: '4px 0 18px', fontSize: 13, color: 'var(--ct-ink-3)' }}>
          {count} invoice{count !== 1 ? 's' : ''} will be marked as{' '}
          <span style={{ fontWeight: 600, color }}>{label}</span>.
          {newStatus === 'paid' && (
            <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--ct-warn)' }}>
              Paid date will be set to today for any unpaid invoices.
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="ct-btn" style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="ct-btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: color, color: '#fff', borderColor: color,
              opacity: loading ? 0.6 : 1, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Updating…' : `Mark as ${label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Kebab row-action menu — ct-panel popover
// ───────────────────────────────────────────────────────────────────────
function KebabMenu({ invoice, onDelete, onStatusChange, onSendByEmail }: {
  invoice: Invoice
  onDelete:       (inv: Invoice) => void
  onStatusChange: (inv: Invoice, status: string) => void
  onSendByEmail:  (inv: Invoice) => void
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

  const allStatuses = [
    { key: 'sent',      label: 'Mark as Sent', tone: 'var(--ct-info)' },
    { key: 'paid',      label: 'Paid',         tone: 'var(--ct-success)' },
    { key: 'cancelled', label: 'Cancelled',    tone: 'var(--ct-danger)' },
    { key: 'draft',     label: 'Draft',        tone: 'var(--ct-ink-4)' },
  ]
  const statusOptions = allStatuses.filter(s => {
    if (s.key === invoice.status) return false
    if (isPaid && s.key === 'paid') return false
    if ((invoice.status === 'sent' || invoice.status === 'overdue') && s.key === 'draft') return false
    return true
  })

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px',
    fontSize: 13, color: 'var(--ct-ink-2)',
    background: 'transparent', border: 'none', width: '100%',
    textAlign: 'left', cursor: 'pointer', borderRadius: 6,
    fontFamily: 'inherit',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="ct-iconbtn"
        style={{ width: 28, height: 28 }}
        aria-label="Row actions"
      >
        <MoreVertical style={{ width: 14, height: 14 }} strokeWidth={1.75} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          minWidth: 180,
          background: 'var(--ct-surface)',
          border: '1px solid var(--ct-line)',
          borderRadius: 'var(--ct-r-md)',
          boxShadow: 'var(--ct-shadow-2)',
          zIndex: 50, padding: 6,
          overflow: 'hidden',
        }}>
          <Link
            href={`/invoices/${invoice.id}`}
            onClick={() => setOpen(false)}
            style={{ ...itemStyle, textDecoration: 'none' }}
          >
            <Eye style={{ width: 14, height: 14, color: 'var(--ct-ink-4)' }} strokeWidth={1.75} />
            <span>View</span>
          </Link>

          {isDraft && (
            <Link
              href={`/invoices/${invoice.id}/edit`}
              onClick={() => setOpen(false)}
              style={{ ...itemStyle, textDecoration: 'none' }}
            >
              <Pencil style={{ width: 14, height: 14, color: 'var(--ct-ink-4)' }} strokeWidth={1.75} />
              <span>Edit</span>
            </Link>
          )}

          {statusOptions.length > 0 && (
            <div style={{ borderTop: '1px solid var(--ct-line)', marginTop: 4, paddingTop: 6 }}>
              <p style={{
                margin: '0 0 4px', padding: '4px 12px',
                fontSize: 10, fontWeight: 600,
                color: 'var(--ct-ink-4)',
                textTransform: 'uppercase', letterSpacing: '0.10em',
              }}>
                Change status
              </p>
              {statusOptions.map(s => (
                <button
                  key={s.key}
                  onClick={() => { setOpen(false); onStatusChange(invoice, s.key) }}
                  style={itemStyle}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: s.tone, flexShrink: 0,
                  }} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {invoice.status !== 'sent' && invoice.status !== 'paid' && (
            <div style={{ borderTop: '1px solid var(--ct-line)', marginTop: 4, paddingTop: 6 }}>
              <button
                onClick={e => { e.stopPropagation(); setOpen(false); onSendByEmail(invoice) }}
                style={itemStyle}
              >
                <Mail style={{ width: 14, height: 14, color: 'var(--ct-ink-4)' }} strokeWidth={1.75} />
                <span>Send by email</span>
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--ct-line)', marginTop: 4, paddingTop: 6 }}>
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onDelete(invoice) }}
              style={{ ...itemStyle, color: 'var(--ct-danger)' }}
            >
              <Trash2 style={{ width: 14, height: 14 }} strokeWidth={1.75} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Bulk action bar — dark sticky strip with tone-coded actions
// ───────────────────────────────────────────────────────────────────────
function BulkBar({ count, unpaidCount, onMarkPaid, onDelete, onClear, marking, deleting }: {
  count: number; unpaidCount: number
  onMarkPaid: () => void; onDelete: () => void; onClear: () => void
  marking: boolean; deleting: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--ct-ink)',
      borderRadius: 'var(--ct-r-md)',
      padding: '10px 14px',
      marginBottom: 14,
      boxShadow: 'var(--ct-shadow-2)',
    }}>
      <span style={{
        fontSize: 13, fontWeight: 600, color: '#fff',
        marginRight: 4, letterSpacing: '-0.005em',
      }}>
        {count} selected
      </span>
      <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />

      {unpaidCount > 0 && (
        <button
          onClick={onMarkPaid}
          disabled={marking}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
            padding: '5px 11px', borderRadius: 6,
            background: 'rgba(40,167,69,0.18)',
            border: '1px solid rgba(40,167,69,0.45)',
            color: '#7DE2A0',
            cursor: marking ? 'default' : 'pointer',
            opacity: marking ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          <CheckCircle2 style={{ width: 12, height: 12 }} strokeWidth={2} />
          <span>{marking ? 'Marking…' : `Mark ${unpaidCount} as paid`}</span>
        </button>
      )}

      <button
        onClick={onDelete}
        disabled={deleting}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600,
          padding: '5px 11px', borderRadius: 6,
          background: 'rgba(184,65,58,0.18)',
          border: '1px solid rgba(184,65,58,0.45)',
          color: '#FF8F88',
          cursor: deleting ? 'default' : 'pointer',
          opacity: deleting ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
      >
        <Trash2 style={{ width: 12, height: 12 }} strokeWidth={2} />
        <span>Delete</span>
      </button>

      <button
        onClick={onClear}
        style={{
          marginLeft: 'auto',
          fontSize: 12, fontWeight: 500,
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

// ───────────────────────────────────────────────────────────────────────
// Sortable column header — quiet baseline, brand state when active
// ───────────────────────────────────────────────────────────────────────
function SortableTh({
  label, field, sortField, sortDir, onClick, align = 'left',
}: {
  label: string
  field: InvSortField
  sortField: InvSortField
  sortDir: 'asc' | 'desc'
  onClick: () => void
  align?: 'left' | 'right'
}) {
  const active = sortField === field
  const arrow  = active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: align,
        padding: '11px 14px',
        fontSize: 11, fontWeight: 600,
        letterSpacing: '0.04em',
        color: active ? 'var(--ct-ink)' : 'var(--ct-ink-3)',
        textTransform: 'uppercase',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {align === 'right' && (
        <span style={{ fontSize: 10, marginRight: 4, color: active ? 'var(--ct-brand)' : 'var(--ct-ink-4)' }}>{arrow}</span>
      )}
      {label}
      {align === 'left' && (
        <span style={{ fontSize: 10, marginLeft: 4, color: active ? 'var(--ct-brand)' : 'var(--ct-ink-4)' }}>{arrow}</span>
      )}
    </th>
  )
}

// ───────────────────────────────────────────────────────────────────────
// Sort options
// ───────────────────────────────────────────────────────────────────────
type InvSortField = 'invoice_number' | 'issue_date' | 'due_date' | 'total'
const INV_SORT_OPTIONS: { label: string; field: InvSortField; dir: 'asc' | 'desc' }[] = [
  { label: 'Newest first', field: 'issue_date', dir: 'desc' },
  { label: 'Oldest first', field: 'issue_date', dir: 'asc' },
  { label: 'Due date',     field: 'due_date',   dir: 'asc' },
  { label: 'Amount ↓',    field: 'total',       dir: 'desc' },
  { label: 'Amount ↑',    field: 'total',       dir: 'asc' },
]

// ───────────────────────────────────────────────────────────────────────
// Filter tabs (ct-tabs sliding pill)
// ───────────────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'draft',   label: 'Draft' },
  { key: 'sent',    label: 'Sent' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid',    label: 'Paid' },
] as const

function FilterTabs({ value, onChange, counts }: {
  value: string
  onChange: (v: string) => void
  counts: Record<string, number>
}) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 })

  function measure() {
    const el = tabRefs.current[value]
    if (!el) return
    setPillStyle({
      width: el.offsetWidth,
      transform: `translateX(${el.offsetLeft}px)`,
      opacity: 1,
    })
  }

  useEffect(() => {
    measure()
    const t1 = setTimeout(measure, 50)
    const t2 = setTimeout(measure, 300)
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      ;(document as any).fonts.ready.then(measure).catch(() => {})
    }
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t1); clearTimeout(t2)
      window.removeEventListener('resize', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="ct-tabs">
      <span className="ct-tabs-pill" style={pillStyle} aria-hidden />
      {FILTER_TABS.map(t => (
        <button
          key={t.key}
          ref={el => { tabRefs.current[t.key] = el }}
          onClick={() => onChange(t.key)}
          className="ct-tab"
          data-active={value === t.key ? 'true' : 'false'}
        >
          <span>{t.label}</span>
          {t.key !== 'all' && counts[t.key] > 0 && (
            <span className="ct-tab-count">{counts[t.key]}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// PAGE
// ───────────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [updating, setUpdating]         = useState(false)
  const [msg, setMsg]                   = useState<string | null>(null)
  const [query, setQuery]               = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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
    async (inv: any) => deleteInvoice(inv.id),
    (inv: any) => String(inv.invoice_number),
    load,
  )

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map(id => deleteInvoice(id)))
      setSelected(new Set()); setBulkDeleteOpen(false); setBulkDeleting(false); load()
    } catch { setBulkDeleting(false) }
  }

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
    const res  = await fetch('/api/invoices/update-overdue', { method: 'POST' })
    const data = await res.json()
    setUpdating(false)
    if (data.updated > 0) {
      setMsg(`${data.updated} invoice${data.updated > 1 ? 's' : ''} marked as overdue`)
      load()
    } else {
      setMsg('No overdue invoices found')
    }
    setTimeout(() => setMsg(null), 3000)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
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
  const mobileSortIdx   = INV_SORT_OPTIONS.findIndex(o => o.field === sortField && o.dir === sortDir)
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

  const overdueCount = invoices.filter(i => i.status === 'sent' && i.due_date < today).length
  const unpaidSelectedCount = Array.from(selected).filter(id => {
    const inv = invoices.find(i => i.id === id)
    return inv && inv.status !== 'paid'
  }).length
  const paidSelectedCount = Array.from(selected).filter(id => {
    const inv = invoices.find(i => i.id === id)
    return inv && inv.status === 'paid'
  }).length

  // Stat aggregates per status
  const stats: Record<'draft' | 'sent' | 'overdue' | 'paid', { count: number; total: number }> = {
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
  const statusCounts: Record<string, number> = {
    draft: stats.draft.count, sent: stats.sent.count,
    overdue: stats.overdue.count, paid: stats.paid.count,
  }

  // ── Stat tile config ────────────────────────────────────────────────
  type Tone = 'neutral' | 'info' | 'danger' | 'success'
  const STAT_TILES: { key: 'draft' | 'sent' | 'overdue' | 'paid'; label: string; tone: Tone; icon: React.ReactNode }[] = [
    { key: 'draft',   label: 'Draft',   tone: 'neutral', icon: <FileText      style={{ width: 13, height: 13 }} strokeWidth={1.75} /> },
    { key: 'sent',    label: 'Sent',    tone: 'info',    icon: <Send          style={{ width: 13, height: 13 }} strokeWidth={1.75} /> },
    { key: 'overdue', label: 'Overdue', tone: 'danger',  icon: <AlertTriangle style={{ width: 13, height: 13 }} strokeWidth={1.75} /> },
    { key: 'paid',    label: 'Paid',    tone: 'success', icon: <CheckCircle2  style={{ width: 13, height: 13 }} strokeWidth={1.75} /> },
  ]

  function handleStatMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <div>
      <PageHeader
        className="fd-page-enter"
        title="Invoices"
        subtitle={loading ? '' : `${invoices.length} invoices`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {overdueCount > 0 && (
              <button
                onClick={handleUpdateOverdue}
                disabled={updating}
                className="ct-btn"
                style={{
                  background: 'var(--ct-danger-soft)',
                  borderColor: 'var(--ct-danger-line)',
                  color: 'var(--ct-danger)',
                  opacity: updating ? 0.6 : 1,
                }}
              >
                <AlertTriangle style={{ width: 14, height: 14 }} strokeWidth={2} />
                <span>{updating ? 'Updating…' : `Mark ${overdueCount} overdue`}</span>
              </button>
            )}
            <Link href="/invoices/new" className="ct-btn ct-btn-primary">
              <span>New invoice</span>
            </Link>
          </div>
        }
      />

      {msg && (
        <div
          className="fd-page-enter"
          style={{
            marginBottom: 14,
            background: 'var(--ct-warn-soft)',
            border: '1px solid var(--ct-warn-line)',
            color: 'var(--ct-warn)',
            fontSize: 13, fontWeight: 500,
            padding: '10px 14px',
            borderRadius: 'var(--ct-r-md)',
            letterSpacing: '-0.005em',
          }}
        >
          {msg}
        </div>
      )}

      {/* ── Stat row ───────────────────────────────────────────────── */}
      {!loading && invoices.length > 0 && (
        <div className="ct-stat-row fd-page-enter" style={{ marginBottom: 18 }}>
          {STAT_TILES.map(({ key, label, tone, icon }) => {
            const isActive = statusFilter === key
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(isActive ? 'all' : key)}
                onMouseMove={handleStatMouseMove}
                className="ct-stat"
                data-tone={tone}
                data-active={isActive ? 'true' : 'false'}
                style={{
                  display: 'block', textAlign: 'left',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span className="ct-stat-rail" aria-hidden />
                <span className="ct-stat-glow" aria-hidden />
                <div className="ct-stat-head">
                  <span className="ct-stat-label">
                    <span className="ct-stat-dot" />
                    {label}
                  </span>
                  <span className="ct-stat-icon">{icon}</span>
                </div>
                <div className="ct-stat-value" style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
                  {stats[key].count}
                </div>
                <div className="ct-stat-foot">
                  <span className="ct-stat-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(stats[key].total)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Toolbar: search + filter tabs + mobile sort ────────────── */}
      <div
        className="fd-page-enter"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap', rowGap: 10,
          marginBottom: 14,
        }}
      >
        <div className="ct-search" style={{ flex: '1 1 240px', maxWidth: 360, minWidth: 200 }}>
          <Search className="ct-search-icon" style={{ width: 14, height: 14 }} strokeWidth={1.75} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search invoices…"
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="ct-search-clear"
              aria-label="Clear search"
            >
              <X style={{ width: 12, height: 12 }} strokeWidth={2} />
            </button>
          )}
        </div>

        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'none' }} className="ct-tabs-host">
          {/* Spacer — keep tabs flex-aligned */}
        </div>

        {/* Desktop tabs */}
        <div style={{ flex: '0 1 auto' }} className="hidden md:block">
          <FilterTabs
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />
        </div>

        {/* Mobile sort cycler */}
        <button
          onClick={cycleInvSort}
          className="ct-btn md:hidden"
          style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {mobileSortLabel}
        </button>
      </div>

      {/* Mobile-only: filter tabs below search */}
      <div className="md:hidden fd-page-enter" style={{ marginBottom: 14, overflowX: 'auto' }}>
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          counts={statusCounts}
        />
      </div>

      {/* ── Bulk bar ───────────────────────────────────────────────── */}
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

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!loading && !invoices.length ? (
        <div className="ct-empty fd-page-enter">
          <span className="ct-empty-icon" aria-hidden>
            <FileText style={{ width: 22, height: 22 }} strokeWidth={1.5} />
          </span>
          <h3 className="ct-empty-title">No invoices yet</h3>
          <p className="ct-empty-sub">
            Invoices here will feed your tax estimates and chase overdue payments automatically.
            Send your first to get the dashboard working.
          </p>
          <Link href="/invoices/new" className="ct-btn ct-btn-primary" style={{ marginTop: 14 }}>
            <span>Send your first invoice</span>
          </Link>
        </div>
      ) : !loading && !sorted.length ? (
        <div className="ct-empty fd-page-enter">
          <span className="ct-empty-icon" aria-hidden>
            <Search style={{ width: 22, height: 22 }} strokeWidth={1.5} />
          </span>
          <h3 className="ct-empty-title">No matches</h3>
          <p className="ct-empty-sub">
            Nothing matches {query ? <>“{query}”</> : 'your current filters'}.
            {statusFilter !== 'all' && <> Try clearing the status filter.</>}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {query && (
              <button onClick={() => setQuery('')} className="ct-btn">
                Clear search
              </button>
            )}
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')} className="ct-btn">
                Clear filter
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ── Desktop table ──────────────────────────────────────── */}
          <div className="ct-table-wrap hidden md:block fd-page-enter">
            <table className="ct-table">
              <thead>
                <tr>
                  <th style={{ width: 40, padding: '11px 14px' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <SortableTh label="Invoice #" field="invoice_number" sortField={sortField} sortDir={sortDir} onClick={() => toggleInvSort('invoice_number')} />
                  <th style={{ textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 600, color: 'var(--ct-ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client</th>
                  <SortableTh label="Issued" field="issue_date" sortField={sortField} sortDir={sortDir} onClick={() => toggleInvSort('issue_date')} />
                  <SortableTh label="Due"    field="due_date"   sortField={sortField} sortDir={sortDir} onClick={() => toggleInvSort('due_date')} />
                  <SortableTh label="Total"  field="total"      sortField={sortField} sortDir={sortDir} onClick={() => toggleInvSort('total')} align="right" />
                  <th style={{ textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 600, color: 'var(--ct-ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ width: 48, padding: '11px 14px' }} />
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="ct-tr">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 14px' }}>
                        <div className="fd-skeleton" style={{ height: 14, width: 80, borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                )) : sorted.map(inv => {
                  const days    = calcDaysOverdue(inv.due_date)
                  const pastDue = isPastDue(inv.status, inv.due_date, today)
                  const isSel   = selected.has(inv.id)
                  return (
                    <tr
                      key={inv.id}
                      className="ct-tr"
                      data-selected={isSel ? 'true' : 'false'}
                      data-tone={pastDue ? 'danger' : undefined}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelect(inv.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        <Link
                          href={`/invoices/${inv.id}`}
                          style={{ color: 'var(--ct-brand)', textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ct-ink-2)' }}>
                        {inv.clients?.name ?? '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--ct-ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(inv.issue_date).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{
                        padding: '12px 14px',
                        color: pastDue ? 'var(--ct-danger)' : 'var(--ct-ink-3)',
                        fontWeight: pastDue ? 600 : 400,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {new Date(inv.due_date).toLocaleDateString('en-GB')}
                        {pastDue && (
                          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500 }}>
                            ({days}d late)
                          </span>
                        )}
                      </td>
                      <td style={{
                        padding: '12px 14px', textAlign: 'right',
                        fontWeight: 600, color: 'var(--ct-ink)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {formatCurrency(inv.total)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div className="ct-tr-actions">
                          <KebabMenu
                            invoice={inv}
                            onDelete={scheduleDelete}
                            onStatusChange={(inv, status) => setStatusTarget({ invoice: inv, status })}
                            onSendByEmail={handleSendByEmail}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ──────────────────────────────────────── */}
          <div className="md:hidden fd-page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ct-panel" style={{ padding: 16 }}>
                <div className="fd-skeleton" style={{ height: 14, width: 96, marginBottom: 10, borderRadius: 4 }} />
                <div className="fd-skeleton" style={{ height: 12, width: 128, marginBottom: 8, borderRadius: 4 }} />
                <div className="fd-skeleton" style={{ height: 12, width: 80, borderRadius: 4 }} />
              </div>
            )) : sorted.map(inv => {
              const days     = calcDaysOverdue(inv.due_date)
              const pastDue  = isPastDue(inv.status, inv.due_date, today)
              const isSel    = selected.has(inv.id)
              return (
                <div
                  key={inv.id}
                  className="ct-panel"
                  data-tone={pastDue ? 'danger' : undefined}
                  style={{
                    padding: 16,
                    borderColor: isSel ? 'var(--ct-info-line)' : pastDue ? 'var(--ct-danger-line)' : 'var(--ct-line)',
                    background: isSel ? 'var(--ct-info-soft)' : pastDue ? 'rgba(184,65,58,0.04)' : 'var(--ct-surface)',
                    transition: 'background 150ms, border-color 150ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSelect(inv.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                      />
                      <Link
                        href={`/invoices/${inv.id}`}
                        style={{
                          fontWeight: 600, color: 'var(--ct-brand)',
                          textDecoration: 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {inv.invoice_number}
                      </Link>
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: 'var(--ct-ink)',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}>
                      {formatCurrency(inv.total)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6, paddingLeft: 28 }}>
                    <span style={{
                      fontSize: 13, color: 'var(--ct-ink-2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {inv.clients?.name ?? '—'}
                    </span>
                    <span style={{ flexShrink: 0 }}>
                      <StatusBadge status={inv.status} />
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingLeft: 28 }}>
                    <span style={{
                      fontSize: 12,
                      color: pastDue ? 'var(--ct-danger)' : 'var(--ct-ink-4)',
                      fontWeight: pastDue ? 600 : 400,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      Due {new Date(inv.due_date).toLocaleDateString('en-GB')}
                      {pastDue && ` · ${days}d late`}
                    </span>
                    <KebabMenu
                      invoice={inv}
                      onDelete={scheduleDelete}
                      onStatusChange={(inv, status) => setStatusTarget({ invoice: inv, status })}
                      onSendByEmail={handleSendByEmail}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {bulkDeleteOpen && (
        <DeleteModal
          invoiceNumber=""
          count={selected.size}
          paidCount={paidSelectedCount}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkDeleting}
        />
      )}
      {statusTarget && (
        <StatusModal
          count={1}
          newStatus={statusTarget.status}
          onConfirm={handleStatusChange}
          onCancel={() => setStatusTarget(null)}
          loading={statusUpdating}
        />
      )}
    </div>
  )
}
