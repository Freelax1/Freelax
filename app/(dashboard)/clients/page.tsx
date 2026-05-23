'use client'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClients } from '@/lib/api/clients'
import { calcOutstanding } from '@/lib/logic/clients'
import { formatCurrency } from '@/lib/tax-calculations'
import PageHeader from '@/components/page-header'
import Badge from '@/components/badge'
import EmptyState from '@/components/empty-state'
import SlideOver from '@/components/slide-over'
import ClientForm from '@/components/client-form'
import Link from 'next/link'
import { DotsThreeVertical, Eye, PencilSimple, Trash, CheckSquare, Square } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'

interface ClientWithStats extends Client { outstanding: number }

// ── Status change confirm modal ───────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const STATUS_LABELS: Record<string, string> = { active: 'Active', paused: 'Paused', archived: 'Archived' }
  const label = STATUS_LABELS[newStatus] ?? newStatus
  const t     = tonePalette(newStatus)
  const color = t.text
  const bg    = t.bg
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/45"
      onClick={onCancel}>
      <div className="bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-text-primary mb-1">
          Change status to <span style={{ color }}>{label}</span>?
        </h2>
        <p className="text-sm text-text-secondary mb-5">
          {count} client{count !== 1 ? 's' : ''} will be marked as{' '}
          <span style={{ fontWeight: 600, color }}>{label}</span>.
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
function KebabMenu({ client, onEdit, onDelete, onStatusChange }: {
  client: ClientWithStats
  onEdit: (c: Client) => void
  onDelete: (c: ClientWithStats) => void
  onStatusChange: (c: ClientWithStats, status: string) => void
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

  const otherStatuses = ['active', 'paused', 'archived'].filter(s => s !== client.status)

  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label="Client actions"
        className="p-1.5 rounded-xl hover:bg-surface-sunken text-text-secondary hover:text-text-primary transition-colors">
        <DotsThreeVertical weight="regular" className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] bg-surface-card border border-border-default rounded-xl z-50 min-w-[160px] overflow-hidden shadow-popover">
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
        </div>
      )}
    </div>
  )
}

// ── Bulk action bar ───────────────────────────────────────────────────
function BulkBar({ count, onDelete, onStatusChange }: {
  count: number
  onDelete: () => void
  onStatusChange: (status: string) => void
}) {
  return (
    <div className="flex items-center gap-2.5 bg-forest-950 rounded-[10px] px-4 py-2.5 mb-3">
      <span className="text-sm font-medium text-white mr-1">
        {count} selected
      </span>
      <div className="w-px h-4 bg-white/15" />
      {['active', 'paused', 'archived'].map(s => (
        <button key={s} onClick={() => onStatusChange(s)}
          className="text-xs font-medium px-2.5 py-1 rounded-[6px] text-white cursor-pointer capitalize bg-white/[0.08] border border-white/[0.12] hover:bg-white/15 transition-colors"
        >
          Mark as {s}
        </button>
      ))}
      <div className="w-px h-4 bg-white/15" />
      <button onClick={onDelete}
        className="text-xs font-medium px-2.5 py-1 rounded-[6px] text-danger-300 cursor-pointer flex items-center gap-[5px] bg-danger-800/30 border border-danger-700/50 hover:bg-danger-800/40 transition-colors"
      >
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </button>
    </div>
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
    { key: 'active',   label: 'Active',   count: activeCount,   outstanding: activeOutstanding },
    { key: 'paused',   label: 'Paused',   count: pausedCount,   outstanding: pausedOutstanding },
    { key: 'archived', label: 'Archived', count: archivedCount, outstanding: 0                 },
  ] as const

  return (
    <div>
      <PageHeader className="fd-page-enter"
        title="Clients"
        subtitle={loading ? '' : `${clients.length} clients`}
        action={<button onClick={openAdd} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Add client</button>}
      />

      {/* Stat / filter cards */}
      {!loading && clients.length > 0 && (
        <div className="fd-page-enter flex gap-3 mt-4 mb-5">
          {CARDS.map(({ key, label, count, outstanding }) => {
            const t = tonePalette(key)
            const isActive = statusFilter === key
            return (
              <button key={key}
                onClick={() => setStatusFilter(isActive ? 'all' : key)}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = t.hover }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = t.bg }}
                className="flex-1 rounded-xl px-5 py-4 cursor-pointer text-left transition-[background] duration-150"
                style={{
                  background: isActive ? 'var(--text-primary)' : t.bg,
                  border: `1px solid ${isActive ? 'var(--text-primary)' : t.border}`,
                }}>
                <p className="text-micro font-semibold mb-1.5" style={{ color: isActive ? 'rgba(255,255,255,0.5)' : t.text }}>{label}</p>
                <p className="text-xl font-semibold tracking-tight mb-px" style={{ color: isActive ? 'var(--text-on-dark)' : t.textValue }}>{count}</p>
                {outstanding > 0 && (
                  <p className="text-caption font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : t.textValue }}>
                    {formatCurrency(outstanding)} outstanding
                  </p>
                )}
              </button>
            )
          })}
          {/* Total outstanding card */}
          <div className="flex-1 bg-surface-sunken rounded-xl px-5 py-4 text-left border border-border-default">
            <p className="text-micro font-semibold text-text-secondary mb-1.5">Total outstanding</p>
            <p className={cn('text-xl font-semibold tracking-tight mb-px', totalOutstanding > 0 ? 'text-danger-700' : 'text-text-primary')}>
              {totalOutstanding > 0 ? formatCurrency(totalOutstanding) : '—'}
            </p>
            <p className="text-caption font-medium text-text-secondary">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="fd-page-enter mb-4 max-w-[360px]">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients..."
            className="w-full pl-9 pr-3 py-[9px] border border-border-default rounded-md text-sm bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 font-[inherit] text-text-primary box-border"
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-text-muted text-base leading-none">×</button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <BulkBar
          count={selected.size}
          onDelete={() => setBulkDeleteOpen(true)}
          onStatusChange={s => setBulkStatusTarget(s)}
        />
      )}

      {!loading && !clients.length ? (
        <EmptyState icon="clients" title="No clients yet" description="Clients connect to your projects, invoices, and IR35 assessments. Add one to start tracking work."
          action={<button onClick={openAdd} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Add your first client</button>} />
      ) : (
        <div className="hidden md:block fd-page-enter bg-surface-card rounded-xl border border-border-default">
          <table className="w-full border-separate border-spacing-0">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-36" />
              <col className="w-48" />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr>
                <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tl-xl">
                  <button onClick={toggleAll} className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                    {allSelected
                      ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" />
                      : <Square weight="regular" className="w-4 h-4" />}
                  </button>
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
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-2.5"><div className="h-4 bg-surface-sunken rounded animate-pulse w-24" /></td>
                ))}</tr>
              )) : filtered.map(c => {
                const isSelected = selected.has(c.id)
                return (
                  <tr key={c.id} className={cn('border-t border-border-subtle hover:bg-surface-sunken transition-colors', isSelected && 'bg-surface-sunken')}>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => toggleSelect(c.id)} className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                        {isSelected
                          ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" />
                          : <Square weight="regular" className="w-4 h-4" />}
                      </button>
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
        <div className="md:hidden fd-page-enter space-y-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-card rounded-xl border border-border-default p-4">
              <div className="h-4 fd-skeleton w-32 mb-3" /><div className="h-3 fd-skeleton w-24" />
            </div>
          )) : filtered.map(c => {
            const isSelected = selected.has(c.id)
            return (
              <div key={c.id} className={`bg-surface-card rounded-xl border p-4 ${isSelected ? 'border-forest-300 bg-forest-50/30' : 'border-border-default'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(c.id)} aria-label={isSelected ? 'Deselect client' : 'Select client'} className="flex items-center flex-shrink-0">
                      {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4 text-text-secondary" />}
                    </button>
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
        <StatusModal
          count={selected.size}
          newStatus={bulkStatusTarget}
          onConfirm={handleBulkStatus}
          onCancel={() => setBulkStatusTarget(null)}
          loading={bulkUpdating}
        />
      )}
    </div>
  )
}
