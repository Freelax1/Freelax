'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { fetchExpenses, deleteExpense } from '@/lib/api/expenses'
import { CATEGORY_LABELS, calcTotalExVat, calcVatReclaimable, calcReceiptsUploaded } from '@/lib/logic/expenses'
import { formatCurrency, getCurrentTaxYear } from '@/lib/tax-calculations'
import { fetchCurrentUser, fetchUserProfile } from '@/lib/api/users'
import { PageHeader, DropdownPanel, ListMetrics, ListSearch, ListBulkBar, FilterChip } from '@/components/ui'
import Button from '@/components/ui/button'
import EmptyState from '@/components/empty-state'
import SlideOver from '@/components/slide-over'
import ExpenseForm from '@/components/expense-form'
import { Paperclip, Trash, DotsThreeVertical, PencilSimple, CheckSquare, Square } from '@phosphor-icons/react'
import type { Expense } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import Tooltip from '@/components/tooltip'

// ── Kebab menu ────────────────────────────────────────────────────────
function KebabMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  return (
    <div ref={ref} className="relative">
      <Tooltip label="Expense actions">
        <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          className="p-1.5 rounded-xl hover:bg-surface-sunken text-text-secondary hover:text-text-primary transition-colors">
          <DotsThreeVertical weight="regular" className="w-4 h-4" />
        </button>
      </Tooltip>
      {open && (
        <DropdownPanel className="min-w-[130px]">
          <button onClick={() => { setOpen(false); onEdit() }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-sunken w-full text-left">
            <PencilSimple weight="regular" className="w-3.5 h-3.5 text-text-secondary" /> Edit
          </button>
          <div className="border-t border-border-subtle">
            <button onClick={() => { setOpen(false); onDelete() }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 w-full text-left">
              <Trash weight="regular" className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </DropdownPanel>
      )}
    </div>
  )
}

// ── Bulk bar ──────────────────────────────────────────────────────────
function BulkBar({ count, onDelete, onClear }: {
  count: number; onDelete: () => void; onClear: () => void
}) {
  return (
    <ListBulkBar count={count} onClear={onClear}>
      <Button type="button" intent="danger-subtle" size="xs" onClick={onDelete}>
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </Button>
    </ListBulkBar>
  )
}

export default function ExpensesPage() {
  const [expenses, setExpenses]         = useState<Expense[]>([])
  const [loading, setLoading]           = useState(true)
  const [slideOpen, setSlideOpen]       = useState(false)
  const [editExpense, setEditExpense]   = useState<Partial<Expense> | undefined>()
  const [vatRegistered, setVatRegistered] = useState(false)
  const [query, setQuery]               = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { start, end, label } = getCurrentTaxYear()

  async function load() {
    const user    = await fetchCurrentUser()
    const profile = user ? await fetchUserProfile(user.id) : null
    setVatRegistered(!!profile?.vat_registered)
    const exp = await fetchExpenses(start, end)
    setExpenses(exp)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const { pendingIds: expenseDeletePending, scheduleDelete: scheduleExpenseDelete } = useUndoDelete(
    async (exp: Expense) => deleteExpense(exp.id),
    (exp: Expense) => exp.merchant,
    load,
  )

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map(id => deleteExpense(id)))
      setSelected(new Set()); setBulkDeleteOpen(false); setBulkDeleting(false); load()
    } catch { setBulkDeleting(false) }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const totalExVat          = calcTotalExVat(expenses)
  const totalVatReclaimable = calcVatReclaimable(expenses)
  const receiptsUploaded    = calcReceiptsUploaded(expenses)

  const categories = ['all', ...Array.from(new Set(expenses.map(e => e.category))).sort()]

  const filtered = expenses.filter(e => {
    const q = query.trim().toLowerCase()
    const matchesQuery = q.length === 0 || (
      e.merchant.toLowerCase().includes(q) ||
      CATEGORY_LABELS[e.category]?.toLowerCase().includes(q)
    )
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter
    return matchesQuery && matchesCategory && !expenseDeletePending.has(e.id)
  })

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={loading ? '' : `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} · ${label}`}
        action={
          <Button type="button" intent="primary" size="sm" onClick={() => { setEditExpense(undefined); setSlideOpen(true) }}>
            Add expense
          </Button>
        }
      />

      {!loading && expenses.length > 0 && (
        <ListMetrics
          items={[
            { label: 'Total ex-VAT', value: formatCurrency(totalExVat) },
            { label: 'VAT reclaimable', value: formatCurrency(totalVatReclaimable) },
            { label: 'Receipts', value: `${receiptsUploaded}/${expenses.length}` },
          ]}
        />
      )}

      {!loading && categories.length > 1 && (
        <div className="flex gap-1.5 flex-wrap mb-3.5">
          {categories.map(cat => {
            const catLabel = cat === 'all' ? 'All categories' : (CATEGORY_LABELS[cat] ?? cat)
            return (
              <FilterChip
                key={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat === categoryFilter && cat !== 'all' ? 'all' : cat)}
              >
                {catLabel}
              </FilterChip>
            )
          })}
        </div>
      )}

      {!loading && (
        <div className="mb-3.5 max-w-md">
          <ListSearch value={query} onChange={setQuery} placeholder="Search expenses…" />
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <BulkBar count={selected.size} onDelete={() => setBulkDeleteOpen(true)} onClear={() => setSelected(new Set())} />
      )}

      {/* Table / empty state */}
      {!loading && !expenses.length ? (
        <EmptyState icon="expense" title="No expenses yet"
          description="Every business cost you log reduces your tax bill. We handle the VAT split and keep your receipts in one place for Self Assessment."
          action={
            <Button type="button" intent="primary" size="sm" onClick={() => { setEditExpense(undefined); setSlideOpen(true) }}>
              Log your first expense
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface-card rounded-xl border border-border-default">
            <table className="w-full border-separate border-spacing-0">
              <colgroup>
                <col className="w-10" />
                <col className="w-28" />
                <col />
                <col className="w-36" />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-10" />
              </colgroup>
              <thead>
                <tr>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tl-xl">
                    <Tooltip label={allSelected ? 'Deselect all' : 'Select all'}>
                      <button onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(e => e.id)))}
                        className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                        {allSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                      </button>
                    </Tooltip>
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Date</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Merchant</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Category</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Amount</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">VAT</th>
                  <th className="px-4 py-2.5 text-center text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Receipt</th>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-2.5"><div className="h-4 fd-skeleton w-20" /></td>)}</tr>
                )) : filtered.map(exp => {
                  const isSelected = selected.has(exp.id)
                  return (
                    <tr key={exp.id} className={cn('border-t border-border-subtle hover:bg-surface-sunken transition-colors', isSelected && 'bg-surface-sunken')}>
                      <td className="px-3 py-2.5 text-center">
                        <Tooltip label={isSelected ? 'Deselect' : 'Select'}>
                          <button onClick={() => toggleSelect(exp.id)} className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                            {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                          </button>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-2.5 font-medium text-sm text-text-primary">{exp.merchant}</td>
                      <td className="px-4 py-2.5 max-w-0">
                        <span className="block truncate text-sm text-text-secondary">
                          {CATEGORY_LABELS[exp.category] ?? exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-sm text-text-primary tabular-nums">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-text-secondary tabular-nums">
                        {exp.vat_reclaimable ? <span className="text-success-700 font-medium">{formatCurrency(exp.vat_amount ?? 0)}</span> : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {exp.receipt_url
                          ? <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:text-forest-700"><Paperclip weight="regular" className="w-3.5 h-3.5 inline" /></a>
                          : <span className="text-text-muted"><Paperclip weight="regular" className="w-3.5 h-3.5 inline" /></span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <KebabMenu
                          onEdit={() => { setEditExpense(exp); setSlideOpen(true) }}
                          onDelete={() => scheduleExpenseDelete(exp)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-card rounded-xl border border-border-default p-4">
                <div className="h-4 fd-skeleton w-24 mb-3" /><div className="h-3 fd-skeleton w-32" />
              </div>
            )) : filtered.map(exp => {
              const isSelected = selected.has(exp.id)
              return (
                <div key={exp.id} className={`bg-surface-card rounded-xl border p-4 ${isSelected ? 'border-forest-300 bg-forest-50/30' : 'border-border-default'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Tooltip label={isSelected ? 'Deselect' : 'Select'}>
                        <button onClick={() => toggleSelect(exp.id)} className="flex items-center flex-shrink-0">
                          {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4 text-text-secondary" />}
                        </button>
                      </Tooltip>
                      <span className="font-medium text-text-primary truncate">{exp.merchant}</span>
                    </div>
                    <span className="font-semibold text-text-primary flex-shrink-0">{formatCurrency(exp.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                    <span className="text-xs text-text-secondary truncate min-w-0">
                      {CATEGORY_LABELS[exp.category] ?? exp.category}
                    </span>
                    {exp.vat_reclaimable && <span className="text-success-700 font-medium text-xs">VAT {formatCurrency(exp.vat_amount ?? 0)}</span>}
                  </div>
                  <div className="flex items-center justify-between pl-7">
                    <span className="text-xs text-text-secondary">{new Date(exp.date).toLocaleDateString('en-GB')}</span>
                    <div className="flex items-center gap-2">
                      {exp.receipt_url && <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-forest-600"><Paperclip weight="regular" className="w-3.5 h-3.5" /></a>}
                      <KebabMenu onEdit={() => { setEditExpense(exp); setSlideOpen(true) }} onDelete={() => scheduleExpenseDelete(exp)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {bulkDeleteOpen && (
        <ConfirmDeleteModal
          title={selected.size > 1 ? `Delete ${selected.size} expenses?` : 'Delete expense?'}
          description="Selected items will be permanently removed."
          confirmLabel="Delete"
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkDeleting}
        />
      )}

      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)}
        title={editExpense ? 'Edit expense' : 'Add expense'}>
        <ExpenseForm expense={editExpense} vatRegistered={vatRegistered} onSuccess={() => { setSlideOpen(false); load() }} />
      </SlideOver>
    </div>
  )
}
