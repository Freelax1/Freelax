'use client'
export const dynamic = 'force-dynamic'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchProjects, deleteProject, updateProject } from '@/lib/api/projects'
import { formatCurrency } from '@/lib/tax-calculations'
import PageHeader from '@/components/page-header'
import Badge from '@/components/badge'
import EmptyState from '@/components/empty-state'
import Link from 'next/link'
import { DotsThreeVertical, Eye, PencilSimple, Trash, CheckSquare, Square } from '@phosphor-icons/react'
import type { Project } from '@/types/database'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import Tooltip from '@/components/tooltip'
import SlideOver from '@/components/slide-over'
import ProjectForm from '@/components/project-form'

// ── Status modal ──────────────────────────────────────────────────────
function StatusModal({ count, newStatus, onConfirm, onCancel, loading }: {
  count: number; newStatus: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const STATUS_LABELS: Record<string, string> = {
    active: 'Active', completed: 'Completed', on_hold: 'On Hold', cancelled: 'Cancelled',
  }
  const label = STATUS_LABELS[newStatus] ?? newStatus
  const color = tonePalette(newStatus).text
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/45"
      onClick={onCancel}>
      <div className="bg-surface-card rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-text-primary mb-1">
          Change status to <span style={{ color }}>{label}</span>?
        </h2>
        <p className="text-sm text-text-secondary mb-5">
          {count} project{count !== 1 ? 's' : ''} will be marked as <span style={{ fontWeight: 600, color }}>{label}</span>.
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
function KebabMenu({ project, onDelete, onStatusChange, onEdit }: {
  project: Project
  onDelete: (p: Project) => void
  onStatusChange: (p: Project, status: string) => void
  onEdit: (p: Project) => void
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

  const allStatuses = ['active', 'completed', 'on_hold', 'cancelled']
  const otherStatuses = allStatuses.filter(s => s !== project.status)

  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label="Project actions"
        className="p-1.5 rounded-xl hover:bg-surface-sunken text-text-secondary hover:text-text-primary transition-colors">
        <DotsThreeVertical weight="regular" className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] bg-surface-card border border-border-default rounded-xl z-50 min-w-[160px] overflow-hidden shadow-popover">
          <Link href={`/projects/${project.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken">
            <Eye weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> View
          </Link>
          <button onClick={() => { setOpen(false); onEdit(project) }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken w-full text-left">
            <PencilSimple weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> Edit
          </button>
          {/* Status options */}
          <div className="border-t border-border-subtle py-1.5">
            <p className="text-micro font-semibold text-text-secondary px-4 pt-1 pb-1.5">Change status</p>
            {otherStatuses.map(s => (
              <button key={s} onClick={() => { setOpen(false); onStatusChange(project, s) }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken w-full text-left">
                <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tonePalette(s).dot }} />
                {s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="border-t border-border-subtle">
            <button onClick={() => { setOpen(false); onDelete(project) }}
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
function BulkBar({ count, onDelete, onStatusChange }: {
  count: number; onDelete: () => void; onStatusChange: (s: string) => void
}) {
  return (
    <div className="flex items-center gap-2.5 bg-forest-950 rounded-lg px-4 py-2.5 mb-3">
      <span className="text-sm font-medium text-white mr-1">{count} selected</span>
      <div className="w-px h-4 bg-white/15" />
      {['active', 'completed', 'on_hold'].map(s => (
        <button key={s} onClick={() => onStatusChange(s)}
          className="text-xs font-medium px-2.5 py-1 rounded-md capitalize text-white bg-white/[0.08] border border-white/[0.12] cursor-pointer transition-colors hover:bg-white/15"
        >
          Mark as {s.replace('_', ' ')}
        </button>
      ))}
      <div className="w-px h-4 bg-white/15" />
      <button onClick={onDelete}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md cursor-pointer text-danger-300 bg-danger-800/30 border border-danger-700/50 hover:bg-danger-800/40 transition-colors"
      >
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </button>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, count, value, color, bg, border }: {
  label: string; count: number; value?: string; color: string; bg: string; border: string
}) {
  return (
    <div className="flex-1 rounded-lg px-5 py-4" style={{ background: bg, border: `1px solid ${border}` }}>
      <p className="text-caption font-semibold mb-1.5" style={{ color }}>{label}</p>
      <p className="text-2xl font-semibold tracking-tight leading-none" style={{ color }}>{count}</p>
      {value && <p className="text-xs mt-1 opacity-70" style={{ color }}>{value}</p>}
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects]           = useState<Project[]>([])
  const [loading, setLoading]             = useState(true)
  const [query, setQuery]                 = useState('')
  const [ir35Filter, setIr35Filter]       = useState<string>('all')
  const [statusFilter, setStatusFilter]     = useState<string>('all')
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget]   = useState<Project | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating]   = useState(false)
  const [slideOpen, setSlideOpen]         = useState(false)
  const [editProject, setEditProject]     = useState<Partial<Project> | undefined>()

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
        action={<button onClick={() => { setEditProject(undefined); setSlideOpen(true) }} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Add project</button>}
      />

      {/* Stat cards */}
      {!loading && projects.length > 0 && (
        <div className="fd-stat-grid mb-6">
          {([
            { key: 'active',    label: 'Active',    count: active.length,    value: active.length > 0 ? `${formatCurrency(active.reduce((s, p) => s + (p.rate_amount ? Number(p.rate_amount) : 0), 0))} total rate` : undefined },
            { key: 'completed', label: 'Completed', count: completed.length, value: undefined },
            { key: 'on_hold',   label: 'On hold',   count: onHold.length,    value: undefined },
          ] as const).map(({ key, label, count, value }) => {
            const t = tonePalette(key)
            const isActive = statusFilter === key
            return (
              <button key={key}
                onClick={() => setStatusFilter(isActive ? 'all' : key)}
                className="flex-1 rounded-lg px-5 py-4 text-left cursor-pointer transition-all duration-150"
                style={{
                  background: isActive ? 'var(--text-primary)' : t.bg,
                  border: `1px solid ${isActive ? 'var(--text-primary)' : t.border}`,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}>
                <p className="text-micro font-semibold mb-1.5" style={{ color: isActive ? 'rgba(255,255,255,0.5)' : t.text }}>{label}</p>
                <p className="text-xl font-semibold tracking-tight mb-px" style={{ color: isActive ? 'var(--text-on-dark)' : t.textValue }}>{count}</p>
                {value && <p className="text-caption font-medium" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : t.textValue }}>{value}</p>}
              </button>
            )
          })}
          {/* Total rate value — non-clickable */}
          <div className="flex-1 bg-surface-sunken rounded-xl px-5 py-4 border border-border-default">
            <p className="text-micro font-semibold text-text-secondary mb-1.5">Total rate value</p>
            <p className="text-xl font-semibold text-text-primary tracking-tight mb-px">{projects.length}</p>
            {totalValue > 0 && <p className="text-caption font-medium text-text-secondary">{formatCurrency(totalValue)}</p>}
          </div>
        </div>
      )}

      {/* IR35 filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[
          { key: 'all', label: 'All projects' },
          { key: 'outside_ir35', label: 'Outside IR35' },
          { key: 'inside_ir35', label: 'Inside IR35' },
          { key: 'needs_review', label: 'Needs review' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setIr35Filter(key)}
            className={cn('px-3 py-1 rounded-xl text-xs cursor-pointer transition-all duration-[120ms] border', ir35Filter === key ? 'bg-forest-950 text-white border-forest-950 font-semibold' : 'bg-surface-card text-text-secondary border-border-default font-normal')}
          >{label}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-[360px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
        </svg>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects..."
          className="w-full pl-9 pr-3 py-2 border border-border-default rounded-md text-sm bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 font-[inherit] text-text-primary box-border"
          onKeyDown={e => e.key === 'Escape' && setQuery('')}
        />
        {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted text-base">×</button>}
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <BulkBar count={selected.size} onDelete={() => setBulkDeleteOpen(true)} onStatusChange={s => setBulkStatusTarget(s)} />
      )}

      {/* Table */}
      <div className="fd-page-enter">
        {!loading && !projects.length ? (
          <EmptyState icon="projects" title="No projects yet" description="Each project lets you track time, link expenses, and get an IR35 status on the contract. Start with your current piece of work."
            action={<button onClick={() => { setEditProject(undefined); setSlideOpen(true) }} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Create your first project</button>} />
        ) : (
          <div className="hidden md:block bg-surface-card rounded-xl border border-border-default">
            <table className="w-full border-separate border-spacing-0">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-36" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-36" />
                <col className="w-36" />
                <col className="w-10" />
              </colgroup>
              <thead>
                <tr>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tl-xl">
                    <button onClick={toggleAll} className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                      {allSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Title</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Client</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Rate</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">End date</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Status</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">IR35</th>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-2.5"><div className="h-4 fd-skeleton w-24" /></td>
                  ))}</tr>
                )) : searched.map((p: Project) => {
                  const isSelected = selected.has(p.id)
                  return (
                    <tr key={p.id} className={cn('border-t border-border-subtle hover:bg-surface-sunken transition-colors', isSelected && 'bg-surface-sunken')}>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => toggleSelect(p.id)} className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                          {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-sm">
                        <Link href={`/projects/${p.id}`} className="hover:text-forest-600">{p.title}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary">
                        {p.clients?.id
                          ? <Link href={`/clients/${p.clients.id}`} className="hover:text-forest-600 hover:underline">{p.clients.name}</Link>
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">
                        {p.rate_amount ? `${formatCurrency(p.rate_amount)}${p.rate_type === 'day_rate' ? '/day' : p.rate_type === 'hourly' ? '/hr' : ''}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums">{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-4 py-2.5"><Badge status={p.status} /></td>
                      <td className="px-4 py-2.5"><Badge status={p.ir35_status} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <KebabMenu project={p} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} onEdit={p => { setEditProject(p); setSlideOpen(true) }} />
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
            <div key={i} className="bg-surface-card rounded-xl border border-border-default p-4">
              <div className="h-4 fd-skeleton w-32 mb-3" /><div className="h-3 fd-skeleton w-24" />
            </div>
          )) : searched.map((p: Project) => {
            const isSelected = selected.has(p.id)
            return (
              <div key={p.id} className={`bg-surface-card rounded-xl border p-4 ${isSelected ? 'border-forest-300 bg-forest-50/30' : 'border-border-default'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Tooltip label={isSelected ? 'Deselect' : 'Select'}>
                      <button onClick={() => toggleSelect(p.id)} className="flex items-center flex-shrink-0">
                        {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4 text-text-secondary" />}
                      </button>
                    </Tooltip>
                    <Link href={`/projects/${p.id}`} className="font-medium text-text-primary hover:text-forest-600 truncate">{p.title}</Link>
                  </div>
                  <div className="flex-shrink-0"><Badge status={p.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-text-secondary truncate">{p.clients?.name ?? '—'}</span>
                  <div className="flex-shrink-0"><Badge status={p.ir35_status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-7">
                  <span className="text-xs text-text-secondary">{p.end_date ? new Date(p.end_date).toLocaleDateString('en-GB') : 'No end date'}</span>
                  <KebabMenu project={p} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} onEdit={p => { setEditProject(p); setSlideOpen(true) }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* IR35 empty state */}
        {ir35Filter !== 'all' && searched.length === 0 && !loading && (
          <div className="bg-surface-card rounded-xl border border-border-default p-8 text-center">
            <h3 className="text-base font-semibold text-text-primary mb-2">
              IR35 assessment
            </h3>
            <p className="text-sm text-text-secondary mb-5 max-w-md mx-auto">
              For each project, we ask 8 questions based on UK case law and give you an Outside / Inside / Needs Review result. Add a project to get your first assessment.
            </p>
            <button onClick={() => { setEditProject(undefined); setSlideOpen(true) }}
              className="inline-block bg-forest-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-forest-800">
              Add a project →
            </button>
          </div>
        )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete project?"
          description={`${deleteTarget.title} will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      {bulkDeleteOpen && (
        <ConfirmDeleteModal
          title={selected.size > 1 ? `Delete ${selected.size} projects?` : 'Delete project?'}
          description={`${selected.size} project${selected.size !== 1 ? 's' : ''} will be permanently removed.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkUpdating}
        />
      )}
      {bulkStatusTarget && <StatusModal count={selected.size} newStatus={bulkStatusTarget} onConfirm={handleBulkStatus} onCancel={() => setBulkStatusTarget(null)} loading={bulkUpdating} />}

      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editProject ? 'Edit project' : 'Add project'}
        width="lg"
        footer={
          <button form="project-form" type="submit"
            className="w-full bg-forest-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors">
            {editProject ? 'Save changes' : 'Add project'}
          </button>
        }
      >
        <ProjectForm project={editProject} onSuccess={() => { setSlideOpen(false); load() }} />
      </SlideOver>
    </div>
  )
}
