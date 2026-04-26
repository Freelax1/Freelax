'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchInvoices, deleteInvoice } from '@/lib/api/invoices'
import { calcDaysOverdue, isPastDue } from '@/lib/logic/invoices'
import PageHeader from '@/components/page-header'
import EmptyState from '@/components/empty-state'
import Badge from '@/components/badge'
import Link from 'next/link'
import { MoreVertical, Eye, Pencil, Trash2, Mail } from 'lucide-react'
import type { Invoice } from '@/types/database'

// ── Delete modal ──────────────────────────────────────────────────────
function DeleteModal({ invoiceNumber, count, paidCount, onConfirm, onCancel, loading }: {
  invoiceNumber: string; count?: number; paidCount?: number; onConfirm: () => void; onCancel: () => void; loading: boolean
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
            <h2 className="font-bold text-slate-900">{count && count > 1 ? `Delete ${count} invoices?` : 'Delete invoice?'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{count && count > 1 ? `${count} invoices` : invoiceNumber} will be permanently removed.</p>
          </div>
        </div>
        {paidCount && paidCount > 0 ? (
          <div className="mt-3 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <p className="text-sm text-amber-800 font-medium">⚠ {paidCount} paid invoice{paidCount !== 1 ? 's' : ''} selected</p>
            <p className="text-xs text-amber-700 mt-0.5">Deleting paid invoices will permanently remove them from your income totals on the dashboard and tax pages.</p>
          </div>
        ) : null}
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
    sent:      { label: 'Sent',      color: '#1A5E8A' },
    paid:      { label: 'Paid',      color: '#1D6B35' },
    cancelled: { label: 'Cancelled', color: '#C0392B' },
    draft:     { label: 'Draft',     color: '#64748B' },
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
          {count} invoice{count !== 1 ? 's' : ''} will be marked as <span style={{ fontWeight: 600, color }}>{label}</span>.
          {newStatus === 'paid' && <span className="block mt-1 text-amber-700 text-xs">Paid date will be set to today for any unpaid invoices.</span>}
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
    { key: 'sent',      label: 'Mark as Sent', dot: '#1A5E8A' },
    { key: 'paid',      label: 'Paid',         dot: '#1D6B35' },
    { key: 'cancelled', label: 'Cancelled',    dot: '#C0392B' },
    { key: 'draft',     label: 'Draft',        dot: '#94A3B8' },
  ]
  const statusOptions = allStatuses.filter(s => {
    if (s.key === invoice.status) return false   // hide current status
    if (isPaid && s.key === 'paid') return false  // never re-mark paid
    // A sent or overdue invoice has already left the building — draft makes no sense
    if ((invoice.status === 'sent' || invoice.status === 'overdue') && s.key === 'draft') return false
    return true
  })

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
          <Link href={`/invoices/${invoice.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <Eye className="w-3.5 h-3.5 text-slate-400" /> View
          </Link>
          {isDraft && (
            <Link href={`/invoices/${invoice.id}/edit`} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
              <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit
            </Link>
          )}
          {/* Status options */}
          {statusOptions.length > 0 && (
            <div style={{ borderTop: '1px solid #F1F5F9', padding: '6px 8px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 6px' }}>Change status</p>
              {statusOptions.map(s => (
                <button key={s.key} onClick={() => { setOpen(false); onStatusChange(invoice, s.key) }}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 w-full text-left rounded-md"
                  style={{ border: 'none', cursor: 'pointer', background: 'transparent' }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {invoice.status !== 'sent' && invoice.status !== 'paid' && (
            <div style={{ borderTop: '1px solid #F1F5F9' }}>
              <button onClick={e => { e.stopPropagation(); setOpen(false); onSendByEmail(invoice) }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Send by email
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid #F1F5F9' }}>
            <button onClick={e => { e.stopPropagation(); setOpen(false); onDelete(invoice) }}
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
function BulkBar({ count, unpaidCount, onMarkPaid, onDelete, onClear, marking, deleting }: {
  count: number; unpaidCount: number
  onMarkPaid: () => void; onDelete: () => void; onClear: () => void
  marking: boolean; deleting: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#0F172A', borderRadius: 10, padding: '10px 16px', marginBottom: 12,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginRight: 4 }}>{count} selected</span>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      {unpaidCount > 0 && (
        <button onClick={onMarkPaid} disabled={marking} style={{
          fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
          background: 'rgba(29,107,53,0.3)', border: '1px solid rgba(29,107,53,0.5)',
          color: '#6EE7A0', cursor: marking ? 'default' : 'pointer', opacity: marking ? 0.6 : 1,
        }}>
          {marking ? 'Marking…' : `Mark ${unpaidCount} as paid`}
        </button>
      )}
      <button onClick={onDelete} disabled={deleting} style={{
        fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
        background: 'rgba(192,57,43,0.25)', border: '1px solid rgba(192,57,43,0.4)',
        color: '#FF8A80', cursor: deleting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <Trash2 style={{ width: 12, height: 12 }} /> Delete
      </button>
      <button onClick={onClear} style={{
        marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)',
        background: 'none', border: 'none', cursor: 'pointer',
      }}>Clear</button>
    </div>
  )
}

export default function InvoicesPage() {
  const [invoices, setInvoices]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [updating, setUpdating]         = useState(false)
  const [msg, setMsg]                   = useState<string | null>(null)
  const [query, setQuery]               = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkMarking, setBulkMarking]   = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<{ invoice: Invoice; status: string } | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  async function load() { setInvoices(await fetchInvoices()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteInvoice(deleteTarget.id); setDeleteTarget(null); load() }
    catch (e) { console.error(e) }
    finally { setDeleting(false) }
  }

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
    return matchesQuery && matchesStatus
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
                className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50">
                {updating ? 'Updating...' : `Mark ${overdueCount} overdue`}
              </button>
            )}
            <Link href="/invoices/new" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
              New invoice
            </Link>
          </div>
        }
      />

      {msg && <div className="fd-page-enter mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-lg">{msg}</div>}

      {/* Status cards */}
      {!loading && invoices.length > 0 && (
        <div className="fd-stat-grid fd-page-enter">
          {([
            { key: 'draft',   label: 'Draft',   bgColor: '#F8F8F8', hoverColor: '#F0F0F0', borderColor: '#E2E8F0', labelColor: '#999',    valueColor: '#111' },
            { key: 'sent',    label: 'Sent',    bgColor: '#EBF4FD', hoverColor: '#D6ECFB', borderColor: '#B8D9F0', labelColor: '#1A5E8A', valueColor: '#1A5E8A' },
            { key: 'overdue', label: 'Overdue', bgColor: '#FDECEA', hoverColor: '#FAD7D4', borderColor: '#F5C0BB', labelColor: '#C0392B', valueColor: '#C0392B' },
            { key: 'paid',    label: 'Paid',    bgColor: '#EAFAF0', hoverColor: '#D4F5E2', borderColor: '#B8DFC3', labelColor: '#1D6B35', valueColor: '#1D6B35' },
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
                <p style={{ fontSize: 20, fontWeight: 800, color: isActive ? '#fff' : valueColor, letterSpacing: '-0.02em', marginBottom: 2 }}>{stats[key].count}</p>
                <p style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'rgba(255,255,255,0.6)' : valueColor, opacity: isActive ? 1 : 0.8 }}>{formatCurrency(stats[key].total)}</p>
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
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoices..."
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
          action={<Link href="/invoices/new" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Send your first invoice</Link>} />
      ) : (
        <div className="hidden md:block fd-page-enter bg-white rounded-xl border border-slate-200 overflow-visible">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 cursor-pointer"
                  />
                </th>
                {['Invoice #', 'Client', 'Issued', 'Due', 'Total', 'Status', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 font-medium text-slate-600 ${h === 'Total' ? 'text-right' : h === '' ? 'w-10' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 fd-skeleton w-20" /></td>)}</tr>
              )) : filtered.map(inv => {
                const days = calcDaysOverdue(inv.due_date)
                const pastDue = isPastDue(inv.status, inv.due_date, today)
                return (
                  <tr key={inv.id} className={`hover:bg-slate-50 ${pastDue ? 'bg-red-50/30' : ''} ${selected.has(inv.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="rounded border-slate-300 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">{inv.invoice_number}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inv.clients?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                    <td className={`px-4 py-3 ${pastDue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {new Date(inv.due_date).toLocaleDateString('en-GB')}
                      {pastDue && <span className="ml-1 text-xs">({days}d late)</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3"><Badge status={inv.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <KebabMenu invoice={inv} onDelete={setDeleteTarget}
                        onStatusChange={(inv, status) => setStatusTarget({ invoice: inv, status })}
                        onSendByEmail={handleSendByEmail} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}


        {/* Mobile cards — hidden on md and above */}
        <div className="md:hidden fd-page-enter space-y-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="h-4 fd-skeleton w-24 mb-3" />
              <div className="h-3 fd-skeleton w-32 mb-2" />
              <div className="h-3 fd-skeleton w-20" />
            </div>
          )) : filtered.map(inv => {
            const days = calcDaysOverdue(inv.due_date)
            const pastDue = isPastDue(inv.status, inv.due_date, today)
            const isSelected = selected.has(inv.id)
            return (
              <div key={inv.id}
                className={`bg-white rounded-xl border p-4 transition-colors ${
                  pastDue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
                } ${isSelected ? 'border-blue-300 bg-blue-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(inv.id)}
                      onClick={e => e.stopPropagation()} className="rounded border-slate-300 cursor-pointer flex-shrink-0" />
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-blue-600 hover:underline truncate">
                      {inv.invoice_number}
                    </Link>
                  </div>
                  <span className="font-semibold text-slate-900 flex-shrink-0">{formatCurrency(inv.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-slate-600 truncate">{inv.clients?.name ?? '—'}</span>
                  <div className="flex-shrink-0"><Badge status={inv.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-7">
                  <span className={`text-xs ${pastDue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                    Due {new Date(inv.due_date).toLocaleDateString('en-GB')}
                    {pastDue && ` · ${days}d late`}
                  </span>
                  <KebabMenu invoice={inv} onDelete={setDeleteTarget}
                    onStatusChange={(inv, status) => setStatusTarget({ invoice: inv, status })}
                    onSendByEmail={handleSendByEmail} />
                </div>
              </div>
            )
          })}
        </div>

      {deleteTarget && <DeleteModal invoiceNumber={deleteTarget.invoice_number} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
      {bulkDeleteOpen && <DeleteModal invoiceNumber="" count={selected.size} paidCount={paidSelectedCount} onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteOpen(false)} loading={bulkDeleting} />}
      {statusTarget && <StatusModal count={1} newStatus={statusTarget.status} onConfirm={handleStatusChange} onCancel={() => setStatusTarget(null)} loading={statusUpdating} />}
    </div>
  )
}
