'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchExpenses, deleteExpense } from '@/lib/api/expenses'
import { fetchMileageEntries, deleteMileageEntry, calcMileageRelief, calcMileageRate, HMRC_THRESHOLD, HMRC_RATE_FIRST, HMRC_RATE_AFTER } from '@/lib/api/mileage'
import { CATEGORY_LABELS, CATEGORY_COLORS, calcTotalExVat, calcVatReclaimable, calcReceiptsUploaded } from '@/lib/logic/expenses'
import { formatCurrency, getCurrentTaxYear } from '@/lib/tax-calculations'
import { fetchCurrentUser, fetchUserProfile } from '@/lib/api/users'
import PageHeader from '@/components/page-header'
import EmptyState from '@/components/empty-state'
import SlideOver from '@/components/slide-over'
import ExpenseForm from '@/components/expense-form'
import MileageForm from '@/components/mileage-form'
import { Paperclip, Trash, Car, DotsThreeVertical, PencilSimple, CheckSquare, Square, Lock, ArrowRight } from '@phosphor-icons/react'
import type { Expense, MileageEntry } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import Tooltip from '@/components/tooltip'

type Tab = 'expenses' | 'mileage'

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
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label="Expense actions"
        className="p-1.5 rounded-xl hover:bg-surface-sunken text-text-secondary hover:text-text-primary transition-colors">
        <DotsThreeVertical weight="regular" className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] bg-surface-card border border-border-default rounded-xl z-50 min-w-[130px] overflow-hidden shadow-popover">
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
        </div>
      )}
    </div>
  )
}

// ── Bulk bar ──────────────────────────────────────────────────────────
function BulkBar({ count, onDelete, onClear }: {
  count: number; onDelete: () => void; onClear: () => void
}) {
  return (
    <div className="flex items-center gap-2.5 bg-forest-950 rounded-lg px-4 py-2.5 mb-3">
      <span className="text-sm font-medium text-white mr-1">{count} selected</span>
      <div className="w-px h-4 bg-white/15" />
      <button onClick={onDelete}
        className="text-xs font-medium px-2.5 py-1 rounded-md text-danger-300 cursor-pointer flex items-center gap-1.5 bg-danger-800/30 border border-danger-700/50 hover:bg-danger-800/40"
      >
        <Trash weight="regular" className="w-3 h-3" /> Delete
      </button>
      <button onClick={onClear} className="ml-auto text-xs cursor-pointer bg-transparent border-none text-white/70">Clear</button>
    </div>
  )
}

export default function ExpensesPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const initialTab   = searchParams.get('tab') === 'mileage' ? 'mileage' : 'expenses'

  const [tab, setTab]               = useState<Tab>(initialTab as Tab)
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [mileage, setMileage]       = useState<MileageEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [slideOpen, setSlideOpen]   = useState(false)
  const [editExpense, setEditExpense] = useState<Partial<Expense> | undefined>()
  const [deleting, setDeleting]     = useState(false)
  const [userId, setUserId]         = useState('')
  const [vatRegistered, setVatRegistered] = useState(false)
  const [query, setQuery]           = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [canUseMileage, setCanUseMileage] = useState(false)

  const { start, end, label } = getCurrentTaxYear()
  const taxYearStart = start.getFullYear()

  async function load() {
    const user    = await fetchCurrentUser()
    const profile = user ? await fetchUserProfile(user.id) : null
    if (user) setUserId(user.id)
    setVatRegistered(!!profile?.vat_registered)
    if (user) {
      const supabase = createClient()
      const { data: planProfile } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', user.id)
        .single()
      setCanUseMileage(['solo', 'pro', 'studio'].includes(planProfile?.subscription_plan ?? 'free'))
    }
    const [exp, mil] = await Promise.all([
      fetchExpenses(start, end),
      user ? fetchMileageEntries(user.id, taxYearStart) : Promise.resolve([]),
    ])
    setExpenses(exp)
    setMileage(mil)
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const qs = tab === 'mileage' ? '?tab=mileage' : ''
    router.replace(`/expenses${qs}`, { scroll: false })
    setSelected(new Set())
    setQuery('')
    setCategoryFilter('all')
  }, [tab])

  const { pendingIds: expenseDeletePending, scheduleDelete: scheduleExpenseDelete } = useUndoDelete(
    async (exp: Expense) => deleteExpense(exp.id),
    (exp: Expense) => exp.merchant,
    load,
  )
  const { pendingIds: mileageDeletePending, scheduleDelete: scheduleMileageDelete } = useUndoDelete(
    async (entry: MileageEntry) => deleteMileageEntry(entry.id),
    (entry: MileageEntry) => String(entry.description ?? 'Journey'),
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

  // Stats
  const totalExVat         = calcTotalExVat(expenses)
  const totalVatReclaimable = calcVatReclaimable(expenses)
  const receiptsUploaded   = calcReceiptsUploaded(expenses)
  const totalMiles         = mileage.reduce((s, e) => s + Number(e.miles), 0)
  const totalMileageRelief = calcMileageRelief(totalMiles)
  const visibleMileage     = mileage.filter(e => !mileageDeletePending.has(e.id))

  // Unique categories for filter
  const categories = ['all', ...Array.from(new Set(expenses.map(e => e.category))).sort()]

  // Filtered expenses
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

  function openAdd() { setEditExpense(undefined); setSlideOpen(true) }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={loading ? '' : tab === 'expenses'
          ? `${expenses.length} expenses · ${label}`
          : `${mileage.length} journeys · ${totalMiles.toLocaleString('en-GB')} mi`
        }
        action={
          !(tab === 'mileage' && !canUseMileage) && (
            <button onClick={openAdd} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">
              {tab === 'expenses' ? 'Add expense' : 'Log journey'}
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-default mb-5">
        {(['expenses', 'mileage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t ? 'border-forest-900 text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Expenses tab */}
      {tab === 'expenses' && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Total ex-VAT',      value: formatCurrency(totalExVat),           sub: `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}` },
              { label: 'VAT reclaimable',   value: formatCurrency(totalVatReclaimable),   sub: vatRegistered ? 'Registered for VAT' : 'Not VAT registered' },
              { label: 'Receipts uploaded', value: `${receiptsUploaded}/${expenses.length}`, sub: receiptsUploaded === expenses.length ? '✓ All uploaded' : `${expenses.length - receiptsUploaded} missing` },
            ].map(s => (
              <div key={s.label} className="bg-surface-card rounded-xl border border-border-default p-5">
                <p className="text-micro font-semibold text-text-body mb-1.5">{s.label}</p>
                <p className="text-xl font-semibold text-text-primary tracking-tight mb-px">{s.value}</p>
                <p className="text-caption font-medium text-text-secondary">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Category filter pills */}
          {categories.length > 1 && (
            <div className="flex gap-1.5 flex-wrap mb-3.5">
              {categories.map(cat => {
                const isActive = categoryFilter === cat
                const label = cat === 'all' ? 'All categories' : (CATEGORY_LABELS[cat] ?? cat)
                return (
                  <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter && cat !== 'all' ? 'all' : cat)}
                    className={cn('px-3 py-1 rounded-lg text-xs cursor-pointer transition-all duration-[120ms] border', isActive ? 'bg-forest-900 text-white border-forest-900 font-semibold' : 'bg-surface-card text-text-secondary border-border-default font-normal')}
                  >{label}</button>
                )
              })}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3.5 max-w-[360px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search expenses..."
              className="w-full pl-9 pr-3 py-2 border border-border-default rounded-md text-sm bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 font-[inherit] text-text-primary box-border"
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
            />
            {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-text-muted text-base">×</button>}
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <BulkBar count={selected.size} onDelete={() => setBulkDeleteOpen(true)} onClear={() => setSelected(new Set())} />
          )}
        </>
      )}

      {/* Expenses table */}
      {tab === 'expenses' && (
        !loading && !expenses.length ? (
          <EmptyState icon="expense" title="No expenses yet" description="Every business cost you log reduces your tax bill. We handle the VAT split and keep your receipts in one place for Self Assessment."
            action={<button onClick={openAdd} className="bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Log your first expense</button>}
          />
        ) : (
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
                    <button onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(e => e.id)))}
                      className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                      {allSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Date</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Merchant</th>
                  <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Category</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Amount</th>
                  <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">VAT</th>
                  <th className="px-4 py-2.5 text-center text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Receipt</th>
                  <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl"></th>
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
                        <button onClick={() => toggleSelect(exp.id)} className="flex items-center justify-center text-text-secondary hover:text-text-primary">
                          {isSelected ? <CheckSquare weight="regular" className="w-4 h-4 text-text-primary" /> : <Square weight="regular" className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-2.5 font-medium text-sm text-text-primary">{exp.merchant}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', CATEGORY_COLORS[exp.category] ?? 'bg-surface-sunken text-text-secondary')}>
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
                          : <span className="text-text-muted"><Paperclip weight="regular" className="w-3.5 h-3.5 inline" /></span>
                        }
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
        )
      )}


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
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', CATEGORY_COLORS[exp.category] ?? 'bg-surface-sunken text-text-secondary')}>
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

      {/* Mileage tab */}
      {tab === 'mileage' && canUseMileage && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total miles',  value: `${totalMiles.toLocaleString('en-GB')} mi` },
              { label: 'Tax relief',   value: formatCurrency(totalMileageRelief) },
              { label: 'Current rate', value: `${(calcMileageRate(totalMiles) * 100).toFixed(0)}p/mile` },
            ].map(s => (
              <div key={s.label} className="bg-surface-card rounded-xl border border-border-default p-5">
                <p className="text-micro font-semibold text-text-body mb-1.5">{s.label}</p>
                <p className="text-xl font-semibold text-text-primary tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-surface-sunken border border-border-default rounded-xl px-4 py-3 text-xs text-text-secondary mb-5">
            HMRC approved mileage: <strong className="text-text-primary">{(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile</strong> first {HMRC_THRESHOLD.toLocaleString()} miles,
            then <strong className="text-text-primary">{(HMRC_RATE_AFTER * 100).toFixed(0)}p/mile</strong>.
            {totalMiles > 8000 && totalMiles < HMRC_THRESHOLD && (
              <span className="ml-2 text-warning-800 font-medium">{(HMRC_THRESHOLD - totalMiles).toLocaleString()} miles from the rate change.</span>
            )}
          </div>
        </>
      )}

      {tab === 'mileage' && canUseMileage && (
        !loading && !mileage.length ? (
          <div className="bg-surface-card rounded-xl border border-border-default p-12 text-center">
            <Car weight="regular" className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary text-sm font-medium mb-1">No journeys logged yet</p>
            <p className="text-text-secondary text-xs">Business mileage at {(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile is tax-deductible.</p>
            <button onClick={openAdd} className="mt-4 bg-forest-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-800">Log journey</button>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-surface-card rounded-xl border border-border-default">
              <table className="w-full border-separate border-spacing-0">
                <colgroup>
                  <col className="w-28" />
                  <col />
                  <col />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-10" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default rounded-tl-xl">Date</th>
                    <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Description</th>
                    <th className="px-4 py-2.5 text-left text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Route</th>
                    <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Miles</th>
                    <th className="px-4 py-2.5 text-right text-caption font-medium text-text-muted bg-surface-sunken border-b border-border-default">Relief</th>
                    <th className="px-3 py-2.5 bg-surface-sunken border-b border-border-default rounded-tr-xl"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMileage.map((e, idx) => {
                    const milesBefore = visibleMileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
                    const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
                    const relief = Number(e.miles) * rate
                    return (
                      <tr key={e.id} className="border-t border-border-subtle hover:bg-surface-sunken transition-colors">
                        <td className="px-4 py-2.5 text-sm text-text-secondary tabular-nums whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-2.5 font-medium text-sm text-text-primary">{e.description}</td>
                        <td className="px-4 py-2.5 text-sm text-text-secondary">
                          {e.from_location && e.to_location ? `${e.from_location} → ${e.to_location}` : e.from_location || e.to_location || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-sm tabular-nums">{Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })}</td>
                        <td className="px-4 py-2.5 text-right text-success-700 font-semibold text-sm tabular-nums">£{relief.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button onClick={() => scheduleMileageDelete(e)}
                            className="p-1.5 rounded hover:bg-danger-50 text-text-secondary hover:text-danger-500">
                            <Trash weight="regular" className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-surface-sunken border-t border-border-default">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-caption font-semibold text-text-secondary">Total</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-sm text-text-primary tabular-nums">{totalMiles.toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-sm text-success-700 tabular-nums">£{totalMileageRelief.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {visibleMileage.map((e, idx) => {
                const milesBefore = visibleMileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
                const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
                const relief = Number(e.miles) * rate
                const hasRoute = e.from_location || e.to_location
                return (
                  <div key={e.id} className="bg-surface-card rounded-xl border border-border-default p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-medium text-text-primary">{e.description}</span>
                      <span className="font-semibold text-text-primary flex-shrink-0">{Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi</span>
                    </div>
                    <p className="text-success-700 font-medium text-sm mb-2">{formatCurrency(relief)} tax relief</p>
                    {hasRoute && (
                      <p className="text-xs text-text-secondary mb-2">
                        {e.from_location && e.to_location ? `${e.from_location} → ${e.to_location}` : e.from_location || e.to_location}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{new Date(e.date).toLocaleDateString('en-GB')}</span>
                      <button onClick={() => scheduleMileageDelete(e)}
                        className="p-1.5 rounded hover:bg-danger-50 text-text-secondary hover:text-danger-500">
                        <Trash weight="regular" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      )}

      {tab === 'mileage' && !canUseMileage && !loading && (
        <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-surface-sunken text-center">
          <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
            <Lock weight="regular" className="w-5 h-5 text-text-secondary" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">
            Mileage tracking is available on the Solo plan and above
          </p>
          <Link
            href="/settings?tab=billing"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-forest-900 text-white rounded-xl text-sm font-medium hover:bg-forest-800"
          >
            Upgrade to Solo <ArrowRight weight="regular" className="w-3.5 h-3.5" />
          </Link>
        </div>
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
        title={tab === 'expenses' ? (editExpense ? 'Edit expense' : 'Add expense') : 'Log journey'}>
        {tab === 'expenses'
          ? <ExpenseForm expense={editExpense} vatRegistered={vatRegistered} onSuccess={() => { setSlideOpen(false); load() }} />
          : <MileageForm userId={userId} taxYearStart={taxYearStart} onSuccess={() => { setSlideOpen(false); load() }} />
        }
      </SlideOver>
    </div>
  )
}
