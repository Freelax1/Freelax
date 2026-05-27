'use client'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/tax-calculations'
import { fetchQuotes, deleteQuote, type QuoteListRow } from '@/lib/api/quotes'
import { isQuoteExpired, daysUntilExpiry } from '@/lib/logic/quotes'
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
import Button, { buttonVariants } from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import EmptyState from '@/components/empty-state'
import Badge from '@/components/badge'
import Link from 'next/link'
import { Eye, PencilSimple, Trash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import StatusConfirmModal from '@/components/status-confirm-modal'
import ListPageLayout from '@/components/list-page-layout'
import { KebabMenuTrigger } from '@/components/ui/kebab-menu-trigger'
import { SelectAllIconButton, SelectIconButton } from '@/components/ui/icon-button'

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined',
}

// ── Kebab menu ────────────────────────────────────────────────────────
function KebabMenu({ quote, onDelete, onStatusChange }: {
  quote: QuoteListRow; onDelete: (q: QuoteListRow) => void
  onStatusChange: (q: QuoteListRow, status: string) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const isDraft = quote.status === 'draft'
  const allStatuses = ['draft', 'sent', 'accepted', 'declined']
  const statusOptions = allStatuses.filter(s => s !== quote.status)

  return (
    <div className="relative">
      <KebabMenuTrigger ref={triggerRef} label="More" onClick={e => { e.stopPropagation(); setOpen(o => !o) }} />
      <DropdownPanel anchorRef={triggerRef} open={open} onClose={() => setOpen(false)}>
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
      </DropdownPanel>
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
    <ListBulkBar count={count} onClear={onClear}>
      {statusOptions.map(s => (
        <Button key={s.key} type="button" intent="secondary" size="xs" onClick={() => onStatusChange(s.key)}>
          {s.label}
        </Button>
      ))}
      <Button type="button" intent="danger-subtle" size="xs" onClick={onDelete}>
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </Button>
    </ListBulkBar>
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
  const [quotes, setQuotes]           = useState<QuoteListRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<QuoteListRow | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [query, setQuery]             = useState('')
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [statusTarget, setStatusTarget]   = useState<{ quote: QuoteListRow; status: string } | null>(null)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [sortField, setSortField] = useState<QuoteSortField>('issue_date')
  const [sortDir, setSortDir]     = useState<'desc' | 'asc'>('desc')
  const [msg, setMsg]             = useState<string | null>(null)

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 5000)
  }

  async function load() { setQuotes(await fetchQuotes()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteQuote(deleteTarget.id); setDeleteTarget(null); load() }
    catch { flash('Failed to delete quote') }
    finally { setDeleting(false) }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map(id => deleteQuote(id)))
      setSelected(new Set()); setBulkDeleteOpen(false); setBulkDeleting(false); load()
    } catch {
      flash('Failed to delete quotes')
      setBulkDeleting(false)
    }
  }

  async function handleBulkStatus() {
    if (!bulkStatusTarget) return
    setStatusUpdating(true)
    const ids = Array.from(selected)
    const results = await Promise.all(ids.map(id =>
      fetch('/api/quotes/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: id, status: bulkStatusTarget }),
      })
    ))
    const failed = results.filter(r => !r.ok).length
    if (failed) {
      flash(failed === ids.length ? 'Failed to update status' : `Could not update ${failed} quote${failed > 1 ? 's' : ''}`)
      setStatusUpdating(false)
      return
    }
    setSelected(new Set()); setBulkStatusTarget(null); setStatusUpdating(false); load()
  }

  async function handleStatusChange() {
    if (!statusTarget) return
    setStatusUpdating(true)
    const res = await fetch('/api/quotes/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: statusTarget.quote.id, status: statusTarget.status }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      flash((data as { error?: string }).error ?? 'Failed to update status')
      setStatusUpdating(false)
      return
    }
    setStatusTarget(null); setStatusUpdating(false); load()
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
      (q.expiry_date != null && new Date(q.expiry_date).toLocaleDateString('en-GB').includes(sq)) ||
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

  /** Month headers on mobile only when sorted by issue date. */
  const mobileGroupedByMonth =
    sortField === 'issue_date' ? groupByMonth(sorted, q => q.issue_date) : null

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
    <ListPageLayout>
      <PageHeader
        title="Quotes"
        subtitle={loading ? '' : `${quotes.length} quotes`}
        action={
          <Button type="button" intent="primary" size="sm" onClick={() => router.push('/quotes/new')}>
            New quote
          </Button>
        }
      />

      {msg && <Alert intent="warning" className="mb-4">{msg}</Alert>}

      {loading ? (
        <ListMetricsSkeleton count={2} />
      ) : quotes.length > 0 ? (
        <>
          <ListStatusTabs
            allCount={quotes.length}
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={(['draft', 'sent', 'accepted', 'expired'] as const).map(key => ({
              id: key,
              label: key.charAt(0).toUpperCase() + key.slice(1),
              count: stats[key],
            }))}
          />
          <ListMetrics
            items={[
              {
                label: 'Accepted',
                tooltip: 'Total of accepted quotes.',
                value: formatCurrency(totals.accepted),
                highlight: totals.accepted > 0 ? 'positive' : 'neutral',
              },
              {
                label: 'Awaiting response',
                tooltip: 'Sent quotes still waiting for a reply.',
                value: formatCurrency(totals.sent),
                highlight: totals.sent > 0 ? 'neutral' : 'neutral',
              },
            ]}
          />
        </>
      ) : null}

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <ListSearch value={query} onChange={setQuery} placeholder="Search quotes..." />
          <Button type="button" intent="secondary" size="xs" className="md:hidden flex-shrink-0 whitespace-nowrap" onClick={cycleQuoteSort}>
            {mobileSortLabel}
          </Button>
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

      <div>
        {!loading && !quotes.length ? (
          <EmptyState icon="invoices" title="No quotes yet" description="Quotes let you price work before starting. Accept one and we'll convert it to an invoice automatically."
            action={<Button type="button" intent="primary" size="sm" onClick={() => router.push('/quotes/new')}>Create a quote</Button>} />
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
                    <SelectAllIconButton
                      allSelected={allSelected}
                      onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(q => q.id)))}
                    />
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
                {loading ? (
                  <TableRowsSkeleton rows={4} cells={TABLE_CELL_PRESETS.quote} />
                ) : sorted.map(q => {
                  const expired  = q.status === 'sent' && isQuoteExpired(q.expiry_date)
                  const days     = daysUntilExpiry(q.expiry_date)
                  const isSelected = selected.has(q.id)
                  return (
                    <tr key={q.id} className={cn('border-t border-border-subtle hover:bg-surface-sunken transition-colors', isSelected && 'bg-surface-sunken')}>
                      <td className="px-3 py-2.5 text-center">
                        <SelectIconButton selected={isSelected} onClick={() => toggleSelect(q.id)} />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-sm">
                        <Link href={`/quotes/${q.id}`} className="text-forest-600 hover:underline">{q.quote_number}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary">{q.clients?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums">{new Date(q.issue_date).toLocaleDateString('en-GB')}</td>
                      <td className={`px-4 py-2.5 text-sm tabular-nums ${expired ? 'text-danger-600' : days <= 3 && days >= 0 && q.status === 'sent' ? 'text-warning-600' : 'text-text-secondary'}`}>
                        {q.expiry_date ? new Date(q.expiry_date).toLocaleDateString('en-GB') : '—'}
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
                {items.map(q => {
            const expired = q.status === 'sent' && isQuoteExpired(q.expiry_date)
            const days = daysUntilExpiry(q.expiry_date)
            const isSelected = selected.has(q.id)
            return (
              <div key={q.id} className={`p-4 transition-colors ${isSelected ? 'bg-forest-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <SelectIconButton selected={isSelected} onClick={() => toggleSelect(q.id)} className="flex-shrink-0" />
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
                    Valid until {q.expiry_date ? new Date(q.expiry_date).toLocaleDateString('en-GB') : '—'}
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
            </div>
          ))}
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
      {statusTarget && (
        <StatusConfirmModal
          statusKey={statusTarget.status}
          title={
            <>
              Mark as{' '}
              <span style={{ color: tonePalette(statusTarget.status).text }}>
                {QUOTE_STATUS_LABELS[statusTarget.status] ?? statusTarget.status}
              </span>
              ?
            </>
          }
          description={
            <>
              1 quote will be marked as{' '}
              <span className="font-semibold" style={{ color: tonePalette(statusTarget.status).text }}>
                {QUOTE_STATUS_LABELS[statusTarget.status] ?? statusTarget.status}
              </span>
              .
            </>
          }
          confirmLabel={`Mark as ${QUOTE_STATUS_LABELS[statusTarget.status] ?? statusTarget.status}`}
          onConfirm={handleStatusChange}
          onCancel={() => setStatusTarget(null)}
          loading={statusUpdating}
        />
      )}
      {bulkStatusTarget && (
        <StatusConfirmModal
          statusKey={bulkStatusTarget}
          title={
            <>
              Mark as{' '}
              <span style={{ color: tonePalette(bulkStatusTarget).text }}>
                {QUOTE_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}
              </span>
              ?
            </>
          }
          description={
            <>
              {selected.size} quote{selected.size !== 1 ? 's' : ''} will be marked as{' '}
              <span className="font-semibold" style={{ color: tonePalette(bulkStatusTarget).text }}>
                {QUOTE_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}
              </span>
              .
            </>
          }
          confirmLabel={`Mark as ${QUOTE_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}`}
          onConfirm={handleBulkStatus}
          onCancel={() => setBulkStatusTarget(null)}
          loading={statusUpdating}
        />
      )}
    </ListPageLayout>
  )
}
