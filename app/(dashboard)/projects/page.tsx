'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchProjects, deleteProject, updateProject } from '@/lib/api/projects'
import { formatCurrency } from '@/lib/tax-calculations'
import PageHeader from '@/components/page-header'
import Badge from '@/components/badge'
import EmptyState from '@/components/empty-state'
import Link from 'next/link'
import { MoreVertical, Eye, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import type { Project } from '@/types/database'

// ── Delete modal ──────────────────────────────────────────────────────
function DeleteModal({ title, count, onConfirm, onCancel, loading }: {
  title: string; count?: number; onConfirm: () => void; onCancel: () => void; loading: boolean
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
            <h2 className="font-bold text-slate-900">{count && count > 1 ? `Delete ${count} projects?` : 'Delete project?'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{count && count > 1 ? `${count} projects` : title} will be permanently removed.</p>
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

// ── Status modal ──────────────────────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const cfg: Record<string, { label: string; color: string }> = {
    active:    { label: 'Active',    color: '#1D6B35' },
    completed: { label: 'Completed', color: '#1A5E8A' },
    on_hold:   { label: 'On Hold',   color: '#9A7B0A' },
    cancelled: { label: 'Cancelled', color: '#C0392B' },
  }
  const { label, color } = cfg[newStatus] ?? { label: newStatus, color: '#64748B' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-slate-900 mb-1">
          Change status to <span style={{ color }}>{label}</span>?
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {count} project{count !== 1 ? 's' : ''} will be marked as <span style={{ fontWeight: 600, color }}>{label}</span>.
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
function KebabMenu({ project, onDelete, onStatusChange }: {
  project: Project
  onDelete: (p: Project) => void
  onStatusChange: (p: Project, status: string) => void
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

  const allStatuses = [
    { key: 'active',    label: 'Active',    dot: '#1D6B35' },
    { key: 'completed', label: 'Completed', dot: '#1A5E8A' },
    { key: 'on_hold',   label: 'On Hold',   dot: '#9A7B0A' },
    { key: 'cancelled', label: 'Cancelled', dot: '#C0392B' },
  ]
  const otherStatuses = allStatuses.filter(s => s.key !== project.status)

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
          <Link href={`/projects/${project.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <Eye className="w-3.5 h-3.5 text-slate-400" /> View
          </Link>
          <Link href={`/projects/${project.id}/edit`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
            <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit
          </Link>
          {/* Status options */}
          <div style={{ borderTop: '1px solid #F1F5F9', padding: '6px 0' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 16px 6px' }}>Change status</p>
            {otherStatuses.map(s => (
              <button key={s.key} onClick={() => { setOpen(false); onStatusChange(project, s.key) }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9' }}>
            <button onClick={() => { setOpen(false); onDelete(project) }}
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
function BulkBar({ count, onDelete, onStatusChange }: {
  count: number; onDelete: () => void; onStatusChange: (s: string) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#0F172A', borderRadius: 10, padding: '10px 16px', marginBottom: 12,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginRight: 4 }}>{count} selected</span>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      {['active', 'completed', 'on_hold'].map(s => (
        <button key={s} onClick={() => onStatusChange(s)} style={{
          fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#fff', cursor: 'pointer', transition: 'background 0.1s',
          textTransform: 'capitalize',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        >
          Mark as {s.replace('_', ' ')}
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

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, count, value, color, bg, border }: {
  label: string; count: number; value?: string; color: string; bg: string; border: string
}) {
  return (
    <div style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{count}</p>
      {value && <p style={{ fontSize: 12, color, opacity: 0.7, marginTop: 4 }}>{value}</p>}
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects]           = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [query, setQuery]                 = useState('')
  const [ir35Filter, setIr35Filter]       = useState<string>('all')
  const [statusFilter, setStatusFilter]     = useState<string>('all')
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget]   = useState<any | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating]   = useState(false)

  useEffect(() => {
    const f = searchParams.get('filter')
    if (f && ['outside_ir35', 'inside_ir35', 'needs_review'].includes(f)) setIr35Filter(f)
  }, [searchParams])

  async function load() { setProjects(await fetchProjects()); setLoading(false) }
  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteProject(deleteTarget.id); setDeleteTarget(null); load() }
    catch (e) { console.error(e) }
    finally { setDeleting(false) }
  }

  async function handleBulkDelete() {
    setBulkUpdating(true)
    try {
      await Promise.all(Array.from(selected).map(id => deleteProject(id)))
      setSelected(new Set()); setBulkDeleteOpen(false); setBulkUpdating(false); load()
    } catch { setBulkUpdating(false) }
  }

  async function handleStatusChange(project: Project, newStatus: string) {
    await updateProject(project.id, { status: newStatus })
    load()
  }

  async function handleBulkStatus() {
    if (!bulkStatusTarget) return
    setBulkUpdating(true)
    try {
      await Promise.all(Array.from(selected).map(id => updateProject(id, { status: bulkStatusTarget })))
      setSelected(new Set()); setBulkStatusTarget(null); setBulkUpdating(false); load()
    } catch { setBulkUpdating(false) }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    if (selected.size === searched.length) setSelected(new Set())
    else setSelected(new Set(searched.map((p: Project) => p.id)))
  }

  const filtered = projects
    .filter(p => ir35Filter === 'all' || p.ir35_status === ir35Filter)
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
  const searched = query.trim().length > 0
    ? filtered.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || (p.clients?.name ?? '').toLowerCase().includes(query.toLowerCase()))
    : filtered

  const active    = projects.filter(p => p.status === 'active')
  const completed = projects.filter(p => p.status === 'completed')
  const onHold    = projects.filter(p => p.status === 'on_hold')
  const totalValue = projects.reduce((s, p) => s + (p.rate_amount ? Number(p.rate_amount) : 0), 0)
  const allSelected = searched.length > 0 && selected.size === searched.length

  return (
    <div>
      <PageHeader className="fd-page-enter"
        title="Projects"
        subtitle={loading ? '' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        action={<button onClick={() => router.push('/projects/new')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Add project</button>}
      />

      {/* Stat cards */}
      {!loading && projects.length > 0 && (
        <div className="fd-stat-grid" style={{ marginBottom: 24 }}>
          {[
            { key: 'active',    label: 'Active',    count: active.length,    value: active.length > 0 ? `${formatCurrency(active.reduce((s, p) => s + (p.rate_amount ? Number(p.rate_amount) : 0), 0))} total rate` : undefined, color: '#1D6B35', bg: '#F0FDF4', activeBg: '#1D6B35', border: 'rgba(29,107,53,0.15)' },
            { key: 'completed', label: 'Completed', count: completed.length, value: undefined, color: '#1A5E8A', bg: '#EBF4FD', activeBg: '#1A5E8A', border: 'rgba(26,94,138,0.15)' },
            { key: 'on_hold',   label: 'On hold',   count: onHold.length,    value: undefined, color: '#9A7B0A', bg: '#FEFCE8', activeBg: '#9A7B0A', border: 'rgba(154,123,10,0.15)' },
          ].map(({ key, label, count, value, color, bg, activeBg, border }) => {
            const isActive = statusFilter === key
            return (
              <button key={key}
                onClick={() => setStatusFilter(isActive ? 'all' : key)}
                style={{
                  flex: 1, background: isActive ? '#111' : bg,
                  border: `1px solid ${isActive ? '#111' : border}`,
                  borderRadius: 12, padding: '16px 20px',
                  textAlign: 'left' as const, cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: isActive ? 'rgba(255,255,255,0.5)' : color, marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: isActive ? '#fff' : color, letterSpacing: '-0.02em', marginBottom: 2 }}>{count}</p>
                {value && <p style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'rgba(255,255,255,0.6)' : color, opacity: isActive ? 1 : 0.8 }}>{value}</p>}
              </button>
            )
          })}
          {/* Total rate value — non-clickable */}
          <div style={{ flex: 1, background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 6 }}>Total rate value</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 2 }}>{projects.length}</p>
            {totalValue > 0 && <p style={{ fontSize: 11, fontWeight: 500, color: '#666', opacity: 0.8 }}>{formatCurrency(totalValue)}</p>}
          </div>
        </div>
      )}

      {/* IR35 filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {[
          { key: 'all', label: 'All projects' },
          { key: 'outside_ir35', label: 'Outside IR35' },
          { key: 'inside_ir35', label: 'Inside IR35' },
          { key: 'needs_review', label: 'Needs review' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setIr35Filter(key)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: `1px solid ${ir35Filter === key ? '#111' : '#E0E0E0'}`,
            background: ir35Filter === key ? '#111' : '#fff',
            color: ir35Filter === key ? '#fff' : '#666',
            fontWeight: ir35Filter === key ? 600 : 400, transition: 'all 0.12s',
          }}>{label}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#AAA' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
        </svg>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects..."
          style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E2E2', borderRadius: 10, fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#111', boxSizing: 'border-box' as const }}
          onKeyDown={e => e.key === 'Escape' && setQuery('')}
        />
        {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: 16 }}>×</button>}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <BulkBar count={selected.size} onDelete={() => setBulkDeleteOpen(true)} onStatusChange={s => setBulkStatusTarget(s)} />
      )}

      {/* Table */}
      <div className="fd-page-enter">
        {!loading && !projects.length ? (
          <EmptyState icon="📁" title="No projects yet" description="Each project lets you track time, link expenses, and get an IR35 status on the contract. Start with your current piece of work."
            action={<button onClick={() => router.push('/projects/new')} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Create your first project</button>} />
        ) : (
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-visible">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleAll} className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  {['Title', 'Client', 'Rate', 'End date', 'Status', 'IR35', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 font-medium text-slate-600 ${h === '' ? 'w-10' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                  ))}</tr>
                )) : searched.map((p: Project) => {
                  const isSelected = selected.has(p.id)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50" style={{ background: isSelected ? '#F8FAFC' : undefined }}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(p.id)} className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/projects/${p.id}`} className="hover:text-blue-600">{p.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {p.clients?.id
                          ? <Link href={`/clients/${p.clients.id}`} className="hover:text-blue-600 hover:underline">{p.clients.name}</Link>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.rate_amount ? `${formatCurrency(p.rate_amount)}${p.rate_type === 'day_rate' ? '/day' : p.rate_type === 'hourly' ? '/hr' : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-4 py-3"><Badge status={p.status} /></td>
                      <td className="px-4 py-3"><Badge status={p.ir35_status} /></td>
                      <td className="px-4 py-3 text-right">
                        <KebabMenu project={p} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
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
        <div className="md:hidden space-y-2">
          {loading ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="h-4 fd-skeleton w-32 mb-3" /><div className="h-3 fd-skeleton w-24" />
            </div>
          )) : searched.map((p: Project) => {
            const isSelected = selected.has(p.id)
            return (
              <div key={p.id} className={`bg-white rounded-xl border p-4 ${isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(p.id)} className="flex items-center flex-shrink-0">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600 truncate">{p.title}</Link>
                  </div>
                  <div className="flex-shrink-0"><Badge status={p.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-slate-500 truncate">{p.clients?.name ?? '—'}</span>
                  <div className="flex-shrink-0"><Badge status={p.ir35_status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-7">
                  <span className="text-xs text-slate-400">{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : 'No end date'}</span>
                  <KebabMenu project={p} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
                </div>
              </div>
            )
          })}
        </div>

        {/* IR35 empty state */}
        {ir35Filter !== 'all' && searched.length === 0 && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              IR35 assessment
            </h3>
            <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
              For each project, we ask 8 questions based on UK case law and give you an Outside / Inside / Needs Review result. Add a project to get your first assessment.
            </p>
            <button onClick={() => router.push('/projects/new')}
              className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
              Add a project →
            </button>
          </div>
        )}

      {deleteTarget && <DeleteModal title={deleteTarget.title} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
      {bulkDeleteOpen && <DeleteModal title="" count={selected.size} onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteOpen(false)} loading={bulkUpdating} />}
      {bulkStatusTarget && <StatusModal count={selected.size} newStatus={bulkStatusTarget} onConfirm={handleBulkStatus} onCancel={() => setBulkStatusTarget(null)} loading={bulkUpdating} />}
    </div>
  )
}
