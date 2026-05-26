'use client'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClients } from '@/lib/api/clients'
import { calcOutstanding } from '@/lib/logic/clients'
import { formatCurrency } from '@/lib/tax-calculations'
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
import Badge from '@/components/badge'
import EmptyState from '@/components/empty-state'
import SlideOver from '@/components/slide-over'
import ClientForm from '@/components/client-form'
import Link from 'next/link'
import { Eye, PencilSimple, Trash } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import StatusConfirmModal from '@/components/status-confirm-modal'
import ListPageLayout from '@/components/list-page-layout'
import { KebabMenuTrigger } from '@/components/ui/kebab-menu-trigger'
import { SelectAllIconButton, SelectIconButton } from '@/components/ui/icon-button'

interface ClientWithStats extends Client { outstanding: number }

const CLIENT_STATUS_LABELS: Record<string, string> = { active: 'Active', paused: 'Paused', archived: 'Archived' }

// ── Kebab menu ────────────────────────────────────────────────────────
function KebabMenu({ client, onEdit, onDelete, onStatusChange }: {
  client: ClientWithStats
  onEdit: (c: Client) => void
  onDelete: (c: ClientWithStats) => void
  onStatusChange: (c: ClientWithStats, status: string) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const otherStatuses = ['active', 'paused', 'archived'].filter(s => s !== client.status)

  return (
    <div className="relative">
      <KebabMenuTrigger ref={triggerRef} label="More" onClick={e => { e.stopPropagation(); setOpen(o => !o) }} />
      <DropdownPanel anchorRef={triggerRef} open={open} onClose={() => setOpen(false)}>
          <Link href={`/clients/${client.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken">
            <Eye weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> View
          </Link>
          <button onClick={() => { setOpen(false); onEdit(client) }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken w-full text-left">
            <PencilSimple weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> Edit
          </button>
          {/* Status change options */}
          <div className="border-t border-border-subtle py-1.5">
            <p className="text-micro font-semibold text-text-secondary px-4 pt-1 pb-1.5">Change status</p>
            {otherStatuses.map(s => {
              const STATUS_LABELS: Record<string, string> = { active: 'Active', paused: 'Paused', archived: 'Archived' }
              return (
                <button key={s} onClick={() => { setOpen(false); onStatusChange(client, s) }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken w-full text-left">
                  <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tonePalette(s).dot }} />
                  {STATUS_LABELS[s] ?? s}
                </button>
              )
            })}
          </div>
          <div className="border-t border-border-subtle">
            <button onClick={() => { setOpen(false); onDelete(client) }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 w-full text-left">
              <Trash weight="regular" className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
      </DropdownPanel>
    </div>
  )
}

// ── Bulk action bar ───────────────────────────────────────────────────
function BulkBar({ count, onDelete, onStatusChange, onClear }: {
  count: number
  onDelete: () => void
  onStatusChange: (status: string) => void
  onClear: () => void
}) {
  return (
    <ListBulkBar count={count} onClear={onClear}>
      {['active', 'paused', 'archived'].map(s => (
        <Button key={s} type="button" intent="secondary" size="xs" onClick={() => onStatusChange(s)} className="capitalize">
          Mark as {s}
        </Button>
      ))}
      <Button type="button" intent="danger-subtle" size="xs" onClick={onDelete}>
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </Button>
    </ListBulkBar>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients]             = useState<ClientWithStats[]>([])
  const [loading, setLoading]             = useState(true)
  const [slideOpen, setSlideOpen]         = useState(false)
  const [editClient, setEditClient]       = useState<Partial<Client> | undefined>()
  const [query, setQuery]                 = useState('')
  const [statusFilter, setStatusFilter]   = useState<string>('all')
  const [deleting, setDeleting]           = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating]   = useState(false)

  async function load() {
    const raw = await fetchClients()
    setClients(raw.map((c: Client) => ({ ...c, outstanding: calcOutstanding(c.invoices ?? []) })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const { pendingIds: deletePending, scheduleDelete } = useUndoDelete(
    async (client: ClientWithStats) => {
      const supabase = createClient()
      await supabase.from('clients').delete().eq('id', client.id)
    },
    (client: ClientWithStats) => client.name,
    load,
  )

  async function handleBulkDelete() {
    setBulkUpdating(true)
    try {
      const supabase = createClient()
      await supabase.from('clients').delete().in('id', Array.from(selected))
      setSelected(new Set())
      setBulkDeleteOpen(false)
      setBulkUpdating(false)
      load()
    } catch { setBulkUpdating(false) }
  }

  async function handleStatusChange(client: ClientWithStats, newStatus: string) {
    const supabase = createClient()
    await supabase.from('clients').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', client.id)
    load()
  }

  async function handleBulkStatus() {
    if (!bulkStatusTarget) return
    setBulkUpdating(true)
    try {
      const supabase = createClient()
      await supabase.from('clients').update({ status: bulkStatusTarget, updated_at: new Date().toISOString() }).in('id', Array.from(selected))
      setSelected(new Set())
      setBulkStatusTarget(null)
      setBulkUpdating(false)
      load()
    } catch { setBulkUpdating(false) }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  function openAdd()  { setEditClient(undefined); setSlideOpen(true) }
  function openEdit(c: Client) { setEditClient(c); setSlideOpen(true) }

  const activeCount   = clients.filter(c => c.status === 'active').length
  const pausedCount   = clients.filter(c => c.status === 'paused').length
  const archivedCount = clients.filter(c => c.status === 'archived').length
  const activeOutstanding = clients.filter(c => c.status === 'active').reduce((s, c) => s + c.outstanding, 0)
  const pausedOutstanding = clients.filter(c => c.status === 'paused').reduce((s, c) => s + c.outstanding, 0)
  const totalOutstanding  = clients.reduce((s, c) => s + c.outstanding, 0)

  const filtered = clients.filter(c => {
    const q = query.trim().toLowerCase()
    const matchesQuery = q.length === 0 || (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.contact_name ?? '').toLowerCase().includes(q)
    )
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesQuery && matchesStatus && !deletePending.has(c.id)
  })

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  const CARDS = [
    { key: 'active',   label: 'Active',   count: activeCount },
    { key: 'paused',   label: 'Paused',   count: pausedCount },
    { key: 'archived', label: 'Archived', count: archivedCount },
  ] as const

  return (
    <ListPageLayout>
      <PageHeader
        title="Clients"
        subtitle={loading ? '' : `${clients.length} clients`}
        action={
          <Button type="button" intent="primary" size="sm" onClick={openAdd}>
            Add client
          </Button>
        }
      />

      {loading ? (
        <ListMetricsSkeleton count={2} />
      ) : clients.length > 0 ? (
        <>
          <ListStatusTabs
            allCount={clients.length}
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={CARDS.map(c => ({ id: c.key, label: c.label, count: c.count }))}
          />
          <ListMetrics
            items={[
              {
                label: 'Unpaid — all clients',
                tooltip: 'Unpaid sent and overdue invoices, all clients.',
                value: totalOutstanding > 0 ? formatCurrency(totalOutstanding) : '—',
                highlight: totalOutstanding > 0 ? 'negative' : 'neutral',
              },
              {
                label: 'Unpaid — active clients',
                tooltip: 'Same, active clients only.',
                value: activeOutstanding > 0 ? formatCurrency(activeOutstanding) : '—',
                highlight: activeOutstanding > 0 ? 'negative' : 'neutral',
              },
            ]}
          />
        </>
      ) : null}

      <div className="mb-4 max-w-md">
        <ListSearch value={query} onChange={setQuery} placeholder="Search clients..." />
      </div>

      {someSelected && (
        <BulkBar
          count={selected.size}
          onDelete={() => setBulkDeleteOpen(true)}
          onStatusChange={s => setBulkStatusTarget(s)}
          onClear={() => setSelected(new Set())}
        />
      )}

      {!loading && !clients.length ? (
        <EmptyState icon="clients" title="No clients yet" description="Clients connect to your projects, invoices, and IR35 assessments. Add one to start tracking work."
          action={<Button type="button" intent="primary" size="sm" onClick={openAdd}>Add your first client</Button>} />
      ) : (
        <div className="hidden md:block bg-surface-card rounded-xl border border-border-default">
          <table className="w-full border-separate border-spacing-0">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-36" />
              <col className="w-48" />
              <col className="w-32" />
              <col className="w-36" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tl-xl">
                  <SelectAllIconButton allSelected={allSelected} onClick={toggleAll} />
                </th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Name</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Contact</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Email</th>
                <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Outstanding</th>
                <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Status</th>
                <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableRowsSkeleton rows={4} cells={TABLE_CELL_PRESETS.client} />
              ) : filtered.map(c => {
                const isSelected = selected.has(c.id)
                return (
                  <tr key={c.id} className={cn('border-t border-border-subtle hover:bg-surface-sunken transition-colors', isSelected && 'bg-surface-sunken')}>
                    <td className="px-3 py-2.5 text-center">
                      <SelectIconButton selected={isSelected} onClick={() => toggleSelect(c.id)} />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-sm">
                      <Link href={`/clients/${c.id}`} className="hover:text-forest-600">{c.name}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary">{c.contact_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary">{c.email ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {c.outstanding > 0
                        ? <span className="text-danger-600 font-semibold text-sm tabular-nums">{formatCurrency(c.outstanding)}</span>
                        : <span className="text-text-secondary text-sm">—</span>}
                    </td>
                    <td className="px-4 py-2.5"><Badge status={c.status} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <KebabMenu client={c} onEdit={openEdit} onDelete={scheduleDelete} onStatusChange={handleStatusChange} />
                    </td>
                  </tr>
                )
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-text-secondary text-sm border-t border-border-subtle">No clients match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}


        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <ListMobileCardSkeleton key={i} variant="client" />
              ))}
            </div>
          ) : filtered.map(c => {
            const isSelected = selected.has(c.id)
            return (
              <div key={c.id} className={`bg-surface-card rounded-xl border p-4 ${isSelected ? 'border-forest-300 bg-forest-50/30' : 'border-border-default'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <SelectIconButton selected={isSelected} onClick={() => toggleSelect(c.id)} className="flex-shrink-0" />
                    <Link href={`/clients/${c.id}`} className="font-medium text-text-primary hover:text-forest-700 truncate">{c.name}</Link>
                  </div>
                  <div className="flex-shrink-0"><Badge status={c.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-text-secondary truncate">{c.email ?? c.contact_name ?? '—'}</span>
                  {c.outstanding > 0
                    ? <span className="text-danger-700 font-medium text-sm flex-shrink-0">{formatCurrency(c.outstanding)}</span>
                    : <span className="text-text-secondary text-sm flex-shrink-0">—</span>}
                </div>
                <div className="flex justify-end pl-7">
                  <KebabMenu client={c} onEdit={openEdit} onDelete={scheduleDelete} onStatusChange={handleStatusChange} />
                </div>
              </div>
            )
          })}
        </div>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editClient ? 'Edit client' : 'Add client'}>
        <ClientForm client={editClient} onSuccess={() => { setSlideOpen(false); load() }} />
      </SlideOver>

      {/* Bulk delete modal */}
      {bulkDeleteOpen && (
        <ConfirmDeleteModal
          title={selected.size > 1 ? `Delete ${selected.size} clients?` : 'Delete client?'}
          description={`${selected.size} client${selected.size !== 1 ? 's' : ''} will be permanently removed.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkUpdating}
        />
      )}

      {/* Bulk status modal */}
      {bulkStatusTarget && (
        <StatusConfirmModal
          statusKey={bulkStatusTarget}
          title={
            <>
              Change status to{' '}
              <span style={{ color: tonePalette(bulkStatusTarget).text }}>
                {CLIENT_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}
              </span>
              ?
            </>
          }
          description={
            <>
              {selected.size} client{selected.size !== 1 ? 's' : ''} will be marked as{' '}
              <span className="font-semibold" style={{ color: tonePalette(bulkStatusTarget).text }}>
                {CLIENT_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}
              </span>
              .
            </>
          }
          confirmLabel={`Mark as ${CLIENT_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}`}
          onConfirm={handleBulkStatus}
          onCancel={() => setBulkStatusTarget(null)}
          loading={bulkUpdating}
        />
      )}
    </ListPageLayout>
  )
}
