'use client'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchInvoices, deleteInvoice, type InvoiceListRow } from '@/lib/api/invoices'
import { calcDaysOverdue, isPastDue } from '@/lib/logic/invoices'
import { groupByMonth } from '@/lib/logic/list-display'
import {
  PageHeader,
  DropdownPanel,
  ListStatusTabs,
  ListMetrics,
  ListMetricsSkeleton,
  ListSearch,
  ListBulkBar,
  TableRowsSkeleton,
  ListMobileCardSkeleton,
  TABLE_CELL_PRESETS,
} from '@/components/ui'
import Alert from '@/components/ui/alert'
import Button, { buttonVariants } from '@/components/ui/button'
import EmptyState from '@/components/empty-state'
import Badge from '@/components/badge'
import Link from 'next/link'
import { Eye, PencilSimple, Trash, Envelope } from '@phosphor-icons/react'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import StatusConfirmModal from '@/components/status-confirm-modal'
import ListPageLayout from '@/components/list-page-layout'
import { KebabMenuTrigger } from '@/components/ui/kebab-menu-trigger'

const INVOICE_STATUS_LABELS: Record<string, string> = {
  sent: 'Sent', paid: 'Paid', cancelled: 'Cancelled', draft: 'Draft',
}

// ── Kebab menu ────────────────────────────────────────────────────────
function KebabMenu({ invoice, onDelete, onStatusChange, onSendByEmail }: {
  invoice: InvoiceListRow; onDelete: (inv: InvoiceListRow) => void
  onStatusChange: (inv: InvoiceListRow, status: string) => void; onSendByEmail: (inv: InvoiceListRow) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

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
    <div className="relative">
      <KebabMenuTrigger ref={triggerRef} label="More" onClick={e => { e.stopPropagation(); setOpen(o => !o) }} />
      <DropdownPanel anchorRef={triggerRef} open={open} onClose={() => setOpen(false)}>
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
      </DropdownPanel>
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
    <ListBulkBar count={count} onClear={onClear}>
      {unpaidCount > 0 && (
        <Button type="button" intent="secondary" size="xs" onClick={onMarkPaid} disabled={marking}>
          {marking ? 'Marking…' : `Mark ${unpaidCount} as paid`}
        </Button>
      )}
      <Button type="button" intent="danger-subtle" size="xs" onClick={onDelete} disabled={deleting}>
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </Button>
    </ListBulkBar>
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
  const [invoices, setInvoices]         = useState<InvoiceListRow[]>([])
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
  const [statusTarget, setStatusTarget] = useState<{ invoice: InvoiceListRow; status: string } | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [sortField, setSortField] = useState<InvSortField>('issue_date')
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc')

  async function load() { setInvoices(await fetchInvoices()); setLoading(false) }
  useEffect(() => { load() }, [])

  const { pendingIds: deletePending, scheduleDelete } = useUndoDelete(
    async (inv: InvoiceListRow) => deleteInvoice(inv.id),
    (inv: InvoiceListRow) => String(inv.invoice_number),
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

  async function handleSendByEmail(inv: InvoiceListRow) {
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
    else setSelected(new Set(filtered.map((i: InvoiceListRow) => i.id)))
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

  /** Month headers on mobile only when sorted by issue date (Stripe/Mercury-style flat desktop table). */
  const mobileGroupedByMonth =
    sortField === 'issue_date' ? groupByMonth(sorted, inv => inv.issue_date) : null

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

  const outstandingTotal = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + Number(i.total), 0)

  return (
    <ListPageLayout>
      <PageHeader
        title="Invoices"
        subtitle={loading ? '' : `${invoices.length} invoices`}
        action={
          <div className="flex gap-2">
            {overdueCount > 0 && (
              <Button type="button" intent="danger-subtle" size="sm" onClick={handleUpdateOverdue} disabled={updating}>
                {updating ? 'Updating...' : `Mark ${overdueCount} overdue`}
              </Button>
            )}
            <Link href="/invoices/new" className={buttonVariants({ intent: 'primary', size: 'sm' })}>
              New invoice
            </Link>
          </div>
        }
      />

      {msg && <Alert intent="warning" className="mb-4">{msg}</Alert>}

      {loading ? (
        <ListMetricsSkeleton count={2} />
      ) : invoices.length > 0 ? (
        <>
          <ListStatusTabs
            allCount={invoices.length}
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={(['draft', 'sent', 'overdue', 'paid'] as const).map(key => ({
              id: key,
              label: key.charAt(0).toUpperCase() + key.slice(1),
              count: stats[key].count,
            }))}
          />
          <ListMetrics
            items={[
              {
                label: 'Unpaid invoices',
                tooltip: 'Draft, sent, and overdue. Paid and cancelled excluded.',
                value: formatCurrency(outstandingTotal),
                highlight: outstandingTotal > 0 ? 'negative' : 'neutral',
              },
              {
                label: 'Paid',
                tooltip: 'Total paid on this list.',
                value: formatCurrency(stats.paid.total),
                highlight: stats.paid.total > 0 ? 'positive' : 'neutral',
              },
            ]}
          />
        </>
      ) : null}

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <ListSearch value={query} onChange={setQuery} placeholder="Search invoices..." />
          <Button type="button" intent="secondary" size="xs" className="md:hidden flex-shrink-0 whitespace-nowrap" onClick={cycleInvSort}>
            {mobileSortLabel}
          </Button>
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
        <EmptyState icon="invoice" title="No invoices yet" description="Invoices here will feed your tax estimates and chase overdue payments automatically. Send your first to get the dashboard working."
          action={<Link href="/invoices/new" className={buttonVariants({ intent: 'primary', size: 'sm' })}>Send your first invoice</Link>} />
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
              <col className="w-36" />
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
              {loading ? (
                <TableRowsSkeleton rows={4} cells={TABLE_CELL_PRESETS.invoice} />
              ) : sorted.map(inv => {
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
                })}
            </tbody>
          </table>
        </div>
      )}


        {/* Mobile cards — month sections only when sorted by issue date */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <ListMobileCardSkeleton key={i} variant="invoice" />
              ))}
            </div>
          ) : (mobileGroupedByMonth ?? [{ label: '', items: sorted }]).map(({ label, items }, groupIdx) => (
            <div key={label || `flat-${groupIdx}`}>
              {label && <p className="text-caption font-semibold text-text-muted mb-2 px-1">{label}</p>}
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
      {statusTarget && (
        <StatusConfirmModal
          statusKey={statusTarget.status}
          title={
            <>
              Mark as{' '}
              <span style={{ color: tonePalette(statusTarget.status).text }}>
                {INVOICE_STATUS_LABELS[statusTarget.status] ?? statusTarget.status}
              </span>
              ?
            </>
          }
          description={
            <>
              1 invoice will be marked as{' '}
              <span className="font-semibold" style={{ color: tonePalette(statusTarget.status).text }}>
                {INVOICE_STATUS_LABELS[statusTarget.status] ?? statusTarget.status}
              </span>
              .
            </>
          }
          footerNote={
            statusTarget.status === 'paid' ? (
              <span className="block mt-1 text-warning-800 text-xs">
                Paid date will be set to today for any unpaid invoices.
              </span>
            ) : undefined
          }
          confirmLabel={`Mark as ${INVOICE_STATUS_LABELS[statusTarget.status] ?? statusTarget.status}`}
          onConfirm={handleStatusChange}
          onCancel={() => setStatusTarget(null)}
          loading={statusUpdating}
        />
      )}
    </ListPageLayout>
  )
}
