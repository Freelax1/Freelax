'use client'

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
import { MoreVertical, Eye, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Client } from '@/types/database'
import { Events } from '@/lib/posthog-events'
import { track } from '@/lib/posthog-track'

interface ClientWithStats extends Client { outstanding: number }

// ── Delete confirm modal ──────────────────────────────────────────────
function DeleteModal({ clientName, onConfirm, onCancel, loading, count }: {
  clientName: string; onConfirm: () => void; onCancel: () => void; loading: boolean; count?: number
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
            <h2 className="font-bold text-slate-900">
              {count && count > 1 ? `Delete ${count} clients?` : 'Delete client?'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {count && count > 1 ? `${count} clients` : clientName} will be permanently removed.
            </p>
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

// ── Status change confirm modal ───────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const label = newStatus === 'active' ? 'Active' : newStatus === 'paused' ? 'Paused' : 'Archived'
  const color = newStatus === 'active' ? '#1D6B35' : newStatus === 'paused' ? '#9A7B0A' : '#64748B'
  const bg    = newStatus === 'active' ? '#F0FDF4' : newStatus === 'paused' ? '#FEFCE8' : '#F8FAFC'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-slate-900 mb-1">
          Change status to <span style={{ color }}>{label}</span>?
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {count} client{count !== 1 ? 's' : ''} will be marked as{' '}
          <span style={{ fontWeight: 600, color }}>{label}</span>.
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
          <Link href={`/clients/${client.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <Eye className="w-3.5 h-3.5 text-slate-400" /> View
          </Link>
          <button onClick={() => { setOpen(false); onEdit(client) }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
            <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit
          </button>
          {/* Status change options */}
          <div style={{ borderTop: '1px solid #F1F5F9', padding: '6px 0' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 16px 6px' }}>Change status</p>
            {otherStatuses.map(s => {
              const cfg = {
                active:   { label: 'Active',   dot: '#1D6B35' },
                paused:   { label: 'Paused',   dot: '#9A7B0A' },
                archived: { label: 'Archived', dot: '#94A3B8' },
              }[s] ?? { label: s, dot: '#94A3B8' }
              return (
                <button key={s} onClick={() => { setOpen(false); onStatusChange(client, s) }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0, display: 'inline-block' }} />
                  {cfg.label}
                </button>
              )
            })}
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9' }}>
            <button onClick={() => { setOpen(false); onDelete(client) }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left">
              <Trash2 className="w-3.5 h-3.5" /> Delete
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#0F172A', borderRadius: 10, padding: '10px 16px',
      marginBottom: 12,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginRight: 4 }}>
        {count} selected
      </span>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      {['active', 'paused', 'archived'].map(s => (
        <button key={s} onClick={() => onStatusChange(s)} style={{
          fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', cursor: 'pointer', textTransform: 'capitalize',
          transition: 'background 0.1s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          Mark as {s}
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
  const [deleteTarget, setDeleteTarget]   = useState<ClientWithStats | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating]   = useState(false)

  async function load() {
    const raw = await fetchClients()
    setClients(raw.map((c: any) => ({ ...c, outstanding: calcOutstanding(c.invoices ?? []) })))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('clients').delete().eq('id', deleteTarget.id)
      if (user) track(user.id, Events.CLIENT_DELETED, { client_id: deleteTarget.id })
      setDeleteTarget(null)
      load()
    } catch (e) { console.error(e) }
    finally { setDeleting(false) }
  }

  async function handleBulkDelete() {
    setBulkUpdating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('clients').delete().in('id', Array.from(selected))
      if (user) track(user.id, Events.CLIENT_DELETED, { count: selected.size, bulk: true })
      setSelected(new Set())
      setBulkDeleteOpen(false)
      setBulkUpdating(false)
      load()
    } catch { setBulkUpdating(false) }
  }

  async function handleStatusChange(client: ClientWithStats, newStatus: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('clients').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', client.id)
    if (user) track(user.id, Events.CLIENT_STATUS_CHANGED, { client_id: client.id, status: newStatus })
    load()
  }

  async function handleBulkStatus() {
    if (!bulkStatusTarget) return
    setBulkUpdating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('clients').update({ status: bulkStatusTarget, updated_at: new Date().toISOString() }).in('id', Array.from(selected))
      if (user) track(user.id, Events.CLIENT_STATUS_CHANGED, { count: selected.size, status: bulkStatusTarget, bulk: true })
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

  function openAdd()  { router.push('/clients/new') }
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
    return matchesQuery && matchesStatus
  })

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0

  const CARDS = [
    { key: 'active',   label: 'Active',   count: activeCount,   outstanding: activeOutstanding, bgColor: '#EAFAF0', hoverColor: '#D4F5E2', borderColor: '#B8DFC3', labelColor: '#1D6B35', valueColor: '#1D6B35' },
    { key: 'paused',   label: 'Paused',   count: pausedCount,   outstanding: pausedOutstanding, bgColor: '#FEF9E7', hoverColor: '#FDF0C0', borderColor: '#F5E29B', labelColor: '#9A7B0A', valueColor: '#9A7B0A' },
    { key: 'archived', label: 'Archived', count: archivedCount, outstanding: 0,                 bgColor: '#F8F8F8', hoverColor: '#F0F0F0', borderColor: '#E2E8F0', labelColor: '#999',    valueColor: '#111'    },
  ] as const

  return (
    <div>
      <PageHeader className="fd-page-enter"
        title="Clients"
        subtitle={loading ? '' : `${clients.length} clients`}
        action={<button onClick={openAdd} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Add client</button>}
      />

      {/* Stat / filter cards */}
      {!loading && clients.length > 0 && (
        <div className="fd-page-enter" style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 20 }}>
          {CARDS.map(({ key, label, count, outstanding, bgColor, hoverColor, borderColor, labelColor, valueColor }) => {
            const isActive = statusFilter === key
            return (
              <button key={key}
                onClick={() => setStatusFilter(isActive ? 'all' : key)}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = hoverColor }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = bgColor }}
                style={{
                  flex: 1, background: isActive ? '#111' : bgColor,
                  border: `1px solid ${isActive ? '#111' : borderColor}`,
                  borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
                  textAlign: 'left' as const, transition: 'background 0.15s',
                }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: isActive ? 'rgba(255,255,255,0.5)' : labelColor, marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: isActive ? '#fff' : valueColor, letterSpacing: '-0.02em', marginBottom: 2 }}>{count}</p>
                {outstanding > 0 && (
                  <p style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'rgba(255,255,255,0.6)' : valueColor, opacity: isActive ? 1 : 0.8 }}>
                    {formatCurrency(outstanding)} outstanding
                  </p>
                )}
              </button>
            )
          })}
          {/* Total outstanding card */}
          <div style={{
            flex: 1, background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12, padding: '16px 20px', textAlign: 'left' as const,
          }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 6 }}>Total outstanding</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: totalOutstanding > 0 ? '#C0392B' : '#111', letterSpacing: '-0.02em', marginBottom: 2 }}>
              {totalOutstanding > 0 ? formatCurrency(totalOutstanding) : '—'}
            </p>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#666', opacity: 0.8 }}>{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="fd-page-enter" style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#AAA' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients..."
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              border: '1px solid #E2E2E2', borderRadius: 10, fontSize: 13,
              background: '#fff', outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              fontFamily: 'inherit', color: '#111', boxSizing: 'border-box' as const,
            }}
            onKeyDown={e => e.key === 'Escape' && setQuery('')}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: 16, lineHeight: 1,
            }}>×</button>
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
        <EmptyState icon="👥" title="No clients yet" description="Clients connect to your projects, invoices, and IR35 assessments. Add one to start tracking work."
          action={<button onClick={openAdd} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Add your first client</button>} />
      ) : (
        <div className="hidden md:block fd-page-enter bg-white rounded-xl border border-slate-200 overflow-visible">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                    {allSelected
                      ? <CheckSquare className="w-4 h-4 text-slate-900" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {['Name', 'Contact', 'Email', 'Outstanding', 'Status', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 font-medium text-slate-600 ${h === '' ? 'w-10' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                ))}</tr>
              )) : filtered.map(c => {
                const isSelected = selected.has(c.id)
                return (
                  <tr key={c.id} className="hover:bg-slate-50" style={{ background: isSelected ? '#F8FAFC' : undefined }}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(c.id)} className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-slate-900" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/clients/${c.id}`} className="hover:text-blue-600">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.contact_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{c.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {c.outstanding > 0
                        ? <span className="text-red-600 font-medium">{formatCurrency(c.outstanding)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge status={c.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <KebabMenu client={c} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
                    </td>
                  </tr>
                )
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No clients match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}


        {/* Mobile cards */}
        <div className="md:hidden fd-page-enter space-y-2">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="h-4 fd-skeleton w-32 mb-3" /><div className="h-3 fd-skeleton w-24" />
            </div>
          )) : filtered.map(c => {
            const isSelected = selected.has(c.id)
            return (
              <div key={c.id} className={`bg-white rounded-xl border p-4 ${isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(c.id)} className="flex items-center flex-shrink-0">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                    <Link href={`/clients/${c.id}`} className="font-medium text-slate-900 hover:text-blue-600 truncate">{c.name}</Link>
                  </div>
                  <div className="flex-shrink-0"><Badge status={c.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-slate-500 truncate">{c.email ?? c.contact_name ?? '—'}</span>
                  {c.outstanding > 0
                    ? <span className="text-red-600 font-medium text-sm flex-shrink-0">{formatCurrency(c.outstanding)}</span>
                    : <span className="text-slate-300 text-sm flex-shrink-0">—</span>}
                </div>
                <div className="flex justify-end pl-7">
                  <KebabMenu client={c} onEdit={openEdit} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
                </div>
              </div>
            )
          })}
        </div>

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Edit client">
        <ClientForm client={editClient} onSuccess={() => { setSlideOpen(false); load() }} />
      </SlideOver>

      {/* Single delete modal */}
      {deleteTarget && (
        <DeleteModal
          clientName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Bulk delete modal */}
      {bulkDeleteOpen && (
        <DeleteModal
          clientName=""
          count={selected.size}
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
