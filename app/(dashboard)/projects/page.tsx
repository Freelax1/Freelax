'use client'
export const dynamic = 'force-dynamic'

import { tonePalette, toneFor } from '@/lib/status-palette'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchProjects, deleteProject, updateProject, type ProjectListRow } from '@/lib/api/projects'
import { formatCurrency } from '@/lib/tax-calculations'
import {
  PageHeader,
  DropdownPanel,
  DropdownMenuItem,
  DropdownMenuLink,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  ListStatusTabs,
  ListMetrics,
  ListMetricsSkeleton,
  ListSearch,
  ListBulkBar,
  FilterChip,
  TableRowsSkeleton,
  ListMobileCardSkeleton,
  TABLE_CELL_PRESETS,
  ListPageEmptyState,
  ListTableEmptyRow,
  ListTableEmptyCard,
} from '@/components/ui'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import Badge from '@/components/badge'
import Link from 'next/link'
import { Eye, PencilSimple, Trash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import StatusConfirmModal from '@/components/status-confirm-modal'
import { KebabMenuTrigger } from '@/components/ui/kebab-menu-trigger'
import { SelectAllIconButton, SelectIconButton } from '@/components/ui/icon-button'
import type { Project } from '@/types/database'
import SlideOver from '@/components/slide-over'
import ProjectForm from '@/components/project-form'
import ListPageLayout from '@/components/list-page-layout'

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Active', completed: 'Completed', on_hold: 'On Hold', cancelled: 'Cancelled',
}

// ── Kebab menu ────────────────────────────────────────────────────────
function KebabMenu({ project, onDelete, onStatusChange, onEdit }: {
  project: ProjectListRow
  onDelete: (p: ProjectListRow) => void
  onStatusChange: (p: ProjectListRow, status: string) => void
  onEdit: (p: ProjectListRow) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const allStatuses = ['active', 'completed', 'on_hold', 'cancelled']
  const otherStatuses = allStatuses.filter(s => s !== project.status)

  return (
    <div className="relative">
      <KebabMenuTrigger ref={triggerRef} label="More" onClick={e => { e.stopPropagation(); setOpen(o => !o) }} />
      <DropdownPanel anchorRef={triggerRef} open={open} onClose={() => setOpen(false)}>
          <DropdownMenuLink href={`/projects/${project.id}`} onClick={() => setOpen(false)}>
            <Eye weight="regular" className="w-3.5 h-3.5 text-text-secondary shrink-0" /> View
          </DropdownMenuLink>
          <DropdownMenuItem onClick={() => { setOpen(false); onEdit(project) }}>
            <PencilSimple weight="regular" className="w-3.5 h-3.5 text-text-secondary shrink-0" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Change status</DropdownMenuLabel>
          {otherStatuses.map(s => (
            <DropdownMenuItem key={s} onClick={() => { setOpen(false); onStatusChange(project, s) }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tonePalette(s).dot }} />
              {s === 'on_hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="danger" onClick={() => { setOpen(false); onDelete(project) }}>
            <Trash weight="regular" className="w-3.5 h-3.5 shrink-0" /> Delete
          </DropdownMenuItem>
      </DropdownPanel>
    </div>
  )
}

// ── Bulk bar ──────────────────────────────────────────────────────────
function BulkBar({ count, onDelete, onStatusChange, onClear }: {
  count: number; onDelete: () => void; onStatusChange: (s: string) => void; onClear: () => void
}) {
  return (
    <ListBulkBar count={count} onClear={onClear}>
      {['active', 'completed', 'on_hold', 'cancelled'].map(s => (
        <Button key={s} type="button" intent="secondary" size="xs" onClick={() => onStatusChange(s)} className="capitalize">
          Mark as {s.replace('_', ' ')}
        </Button>
      ))}
      <Button type="button" intent="danger-subtle" size="xs" onClick={onDelete}>
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </Button>
    </ListBulkBar>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects]           = useState<ProjectListRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [query, setQuery]                 = useState('')
  const [ir35Filter, setIr35Filter]       = useState<string>('all')
  const [statusFilter, setStatusFilter]     = useState<string>('all')
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget]   = useState<ProjectListRow | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string | null>(null)
  const [bulkUpdating, setBulkUpdating]   = useState(false)
  const [slideOpen, setSlideOpen]         = useState(false)
  const [editProject, setEditProject]     = useState<Partial<ProjectListRow> | undefined>()
  const [projectSaving, setProjectSaving] = useState(false)
  const [msg, setMsg]                     = useState<string | null>(null)

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(null), 5000)
  }

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
    catch { flash('Failed to delete project') }
    finally { setDeleting(false) }
  }

  async function handleBulkDelete() {
    setBulkUpdating(true)
    try {
      await Promise.all(Array.from(selected).map(id => deleteProject(id)))
      setSelected(new Set()); setBulkDeleteOpen(false); setBulkUpdating(false); load()
    } catch {
      flash('Failed to delete projects')
      setBulkUpdating(false)
    }
  }

  async function handleStatusChange(project: ProjectListRow, newStatus: string) {
    try {
      await updateProject(project.id, { status: newStatus })
      load()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to update status')
    }
  }

  async function handleBulkStatus() {
    if (!bulkStatusTarget) return
    setBulkUpdating(true)
    const ids = Array.from(selected)
    const results = await Promise.allSettled(ids.map(id => updateProject(id, { status: bulkStatusTarget })))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed) {
      flash(failed === ids.length ? 'Failed to update status' : `Could not update ${failed} project${failed > 1 ? 's' : ''}`)
      setBulkUpdating(false)
      return
    }
    setSelected(new Set()); setBulkStatusTarget(null); setBulkUpdating(false); load()
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    if (selected.size === searched.length) setSelected(new Set())
    else setSelected(new Set(searched.map((p: ProjectListRow) => p.id)))
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
  const hasProjects = projects.length > 0
  const tableEmpty = !loading && hasProjects && searched.length === 0

  const IR35_FILTER_LABELS: Record<string, string> = {
    outside_ir35: 'Outside IR35',
    inside_ir35: 'Inside IR35',
    needs_review: 'Needs review',
  }

  function clearProjectFilters() {
    setQuery('')
    setStatusFilter('all')
    setIr35Filter('all')
  }

  const statusTabLabel =
    statusFilter === 'all'
      ? undefined
      : statusFilter === 'on_hold'
        ? 'On hold'
        : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)

  return (
    <ListPageLayout>
      <PageHeader
        title="Projects"
        subtitle={loading ? '' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        action={
          <Button type="button" intent="primary" size="sm" onClick={() => { setEditProject(undefined); setSlideOpen(true) }}>
            Add project
          </Button>
        }
      />

      {msg && <Alert intent="warning" className="mb-4">{msg}</Alert>}

      {loading ? (
        <ListMetricsSkeleton count={2} />
      ) : projects.length > 0 ? (
        <>
          <ListStatusTabs
            allCount={projects.length}
            value={statusFilter}
            onChange={setStatusFilter}
            tabs={[
              { id: 'active', label: 'Active', count: active.length },
              { id: 'completed', label: 'Completed', count: completed.length },
              { id: 'on_hold', label: 'On hold', count: onHold.length },
            ]}
          />
          <ListMetrics
            items={[
              {
                label: 'Projects',
                tooltip: 'All projects, any status.',
                value: String(projects.length),
              },
              {
                label: 'Rate figures',
                tooltip: 'Sum of rate amounts on projects — not invoiced revenue.',
                value: totalValue > 0 ? formatCurrency(totalValue) : '—',
              },
            ]}
          />
        </>
      ) : null}

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[
          { key: 'all', label: 'All projects' },
          { key: 'outside_ir35', label: 'Outside IR35' },
          { key: 'inside_ir35', label: 'Inside IR35' },
          { key: 'needs_review', label: 'Needs review' },
        ].map(({ key, label }) => (
          <FilterChip key={key} active={ir35Filter === key} onClick={() => setIr35Filter(key)}>
            {label}
          </FilterChip>
        ))}
      </div>

      <div className="mb-4 max-w-md">
        <ListSearch value={query} onChange={setQuery} placeholder="Search projects..." />
      </div>

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onDelete={() => setBulkDeleteOpen(true)}
          onStatusChange={s => setBulkStatusTarget(s)}
          onClear={() => setSelected(new Set())}
        />
      )}

      {/* Table */}
      <div>
        {!loading && !projects.length ? (
          <ListPageEmptyState
            variant="project"
            title="No projects yet"
            description="Each project lets you track time, link expenses, and get an IR35 status on the contract. Start with your current piece of work."
            action={<Button type="button" intent="primary" size="sm" onClick={() => { setEditProject(undefined); setSlideOpen(true) }}>Create your first project</Button>}
          />
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
                    <SelectAllIconButton allSelected={allSelected} onClick={toggleAll} />
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Title</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Client</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Rate</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">End date</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Status</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">IR35</th>
                  <th aria-label="Row actions" className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowsSkeleton rows={3} cells={TABLE_CELL_PRESETS.project} />
                ) : searched.map((p: ProjectListRow) => {
                  const isSelected = selected.has(p.id)
                  return (
                    <tr key={p.id} className={cn('border-t border-border-subtle hover:bg-surface-sunken transition-colors', isSelected && 'bg-surface-sunken')}>
                      <td className="px-3 py-2.5 text-center">
                        <SelectIconButton selected={isSelected} onClick={() => toggleSelect(p.id)} />
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
                      <td className="px-4 py-2.5">{p.ir35_status ? <Badge status={p.ir35_status} /> : <span className="text-sm text-text-muted">—</span>}</td>
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
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <ListMobileCardSkeleton key={i} variant="project" />
              ))}
            </div>
          ) : tableEmpty ? (
            <ListTableEmptyCard
              entityPlural="projects"
              query={query}
              statusFilter={statusFilter}
              statusLabel={statusTabLabel}
              ir35Filter={ir35Filter}
              ir35Label={IR35_FILTER_LABELS[ir35Filter]}
              onClearSearch={() => setQuery('')}
              onClearStatus={() => setStatusFilter('all')}
              onClearIr35={() => setIr35Filter('all')}
              onClearAll={clearProjectFilters}
            />
          ) : searched.map((p: ProjectListRow) => {
            const isSelected = selected.has(p.id)
            return (
              <div key={p.id} className={`bg-surface-card rounded-xl border p-4 ${isSelected ? 'border-forest-300 bg-forest-50/30' : 'border-border-default'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <SelectIconButton selected={isSelected} onClick={() => toggleSelect(p.id)} className="flex-shrink-0" />
                    <Link href={`/projects/${p.id}`} className="font-medium text-text-primary hover:text-forest-600 truncate">{p.title}</Link>
                  </div>
                  <div className="flex-shrink-0"><Badge status={p.status} /></div>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="text-sm text-text-secondary truncate">{p.clients?.name ?? '—'}</span>
                  <div className="flex-shrink-0">{p.ir35_status ? <Badge status={p.ir35_status} /> : null}</div>
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
            <Button type="button" intent="primary" size="sm" onClick={() => { setEditProject(undefined); setSlideOpen(true) }}>
              Add a project →
            </Button>
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
      {bulkStatusTarget && (
        <StatusConfirmModal
          statusKey={bulkStatusTarget}
          title={
            <>
              Change status to{' '}
              <span style={{ color: tonePalette(bulkStatusTarget).text }}>
                {PROJECT_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}
              </span>
              ?
            </>
          }
          description={
            <>
              {selected.size} project{selected.size !== 1 ? 's' : ''} will be marked as{' '}
              <span className="font-semibold" style={{ color: tonePalette(bulkStatusTarget).text }}>
                {PROJECT_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}
              </span>
              .
            </>
          }
          confirmLabel={`Mark as ${PROJECT_STATUS_LABELS[bulkStatusTarget] ?? bulkStatusTarget}`}
          onConfirm={handleBulkStatus}
          onCancel={() => setBulkStatusTarget(null)}
          loading={bulkUpdating}
        />
      )}

      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editProject ? 'Edit project' : 'Add project'}
        width="lg"
        footer={
          <Button form="project-form" type="submit" intent="primary" size="md" fullWidth disabled={projectSaving}>
            {projectSaving ? 'Saving…' : editProject ? 'Save changes' : 'Add project'}
          </Button>
        }
      >
        <ProjectForm
          project={editProject as Partial<Project> | undefined}
          onSavingChange={setProjectSaving}
          onSuccess={() => { setSlideOpen(false); setProjectSaving(false); load() }}
        />
      </SlideOver>
    </ListPageLayout>
  )
}
