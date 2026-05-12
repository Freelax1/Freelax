'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchExpenses, deleteExpense } from '@/lib/api/expenses'
import { fetchMileageEntries, deleteMileageEntry, calcMileageRelief, calcMileageRate, HMRC_THRESHOLD, HMRC_RATE_FIRST, HMRC_RATE_AFTER } from '@/lib/api/mileage'
import { CATEGORY_LABELS, CATEGORY_COLORS, calcTotalExVat, calcVatReclaimable, calcReceiptsUploaded } from '@/lib/logic/expenses'
import { formatCurrency, getCurrentTaxYear } from '@/lib/tax-calculations'
import { fetchCurrentUser, fetchUserProfile } from '@/lib/api/users'
import PageHeader from '@/components/page-header'
import SlideOver from '@/components/slide-over'
import ExpenseForm from '@/components/expense-form'
import MileageForm from '@/components/mileage-form'
import {
  Paperclip, Trash2, Car, MoreVertical, Pencil, CheckSquare, Square,
  Lock, ArrowRight, Receipt, Percent, FileCheck2, Search, X, Plus,
  Gauge, Coins,
} from 'lucide-react'
import type { Expense } from '@/types/database'
import { useUndoDelete } from '@/hooks/use-undo-delete'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Tab = 'expenses' | 'mileage'

// ── Delete modal — ct-panel chrome ─────────────────────────────────────
function DeleteModal({ count, onConfirm, onCancel, loading }: {
  count?: number; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(20,23,29,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div className="ct-panel" style={{ width: '100%', maxWidth: 400, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--ct-danger-soft)',
            border: '1px solid var(--ct-danger-line)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Trash2 style={{ width: 18, height: 18, color: 'var(--ct-danger)' }} strokeWidth={1.75} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ct-ink)', letterSpacing: '-0.01em' }}>
              {count && count > 1 ? `Delete ${count} expenses?` : 'Delete expense?'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ct-ink-3)' }}>
              This will be permanently removed.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onCancel} className="ct-btn" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="ct-btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: 'var(--ct-danger)', color: '#fff', borderColor: 'var(--ct-danger)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Kebab menu ─────────────────────────────────────────────────────────
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="ct-iconbtn"
        style={{ width: 28, height: 28 }}
        aria-label="More actions"
        type="button"
      >
        <MoreVertical style={{ width: 14, height: 14 }} strokeWidth={1.75} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          minWidth: 140, zIndex: 50, overflow: 'hidden',
          background: 'var(--ct-surface)',
          border: '1px solid var(--ct-line)',
          borderRadius: 'var(--ct-r-md)',
          boxShadow: 'var(--ct-shadow-2)',
          padding: 4,
        }}>
          <button
            onClick={() => { setOpen(false); onEdit() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 6,
              fontSize: 13, color: 'var(--ct-ink-2)', background: 'none', border: 'none',
              width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Pencil style={{ width: 13, height: 13, color: 'var(--ct-ink-3)' }} strokeWidth={1.75} /> Edit
          </button>
          <div style={{ borderTop: '1px solid var(--ct-line)', marginTop: 4, paddingTop: 4 }}>
            <button
              onClick={() => { setOpen(false); onDelete() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6,
                fontSize: 13, color: 'var(--ct-danger)', background: 'none', border: 'none',
                width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Trash2 style={{ width: 13, height: 13 }} strokeWidth={1.75} /> Delete
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--ct-ink)',
      borderRadius: 'var(--ct-r-md)',
      padding: '10px 14px',
      marginBottom: 12,
      boxShadow: 'var(--ct-shadow-2)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginRight: 4 }}>{count} selected</span>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
      <button
        onClick={onDelete}
        style={{
          fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 6,
          background: 'rgba(184,65,58,0.25)', border: '1px solid rgba(184,65,58,0.45)',
          color: '#FF8A80', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,65,58,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(184,65,58,0.25)')}
      >
        <Trash2 style={{ width: 12, height: 12 }} strokeWidth={1.75} /> Delete
      </button>
      <button
        onClick={onClear}
        style={{
          marginLeft: 'auto', fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Clear
      </button>
    </div>
  )
}

// ── Stat tile (matches invoices/quotes pattern) ──────────────────────
function StatCard({ tone, label, value, sub, Icon }: {
  tone: 'neutral' | 'info' | 'success' | 'warn' | 'danger'
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  Icon: React.ComponentType<{ style?: React.CSSProperties; strokeWidth?: number }>
}) {
  const ref = useRef<HTMLDivElement>(null)
  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <div
      ref={ref}
      className="ct-stat"
      data-tone={tone}
      onMouseMove={handleMove}
      style={{ cursor: 'default' }}
    >
      <span className="ct-stat-rail" aria-hidden />
      <span className="ct-stat-glow" aria-hidden />
      <div className="ct-stat-head">
        <span className="ct-stat-label">
          <span className="ct-stat-dot" />
          {label}
        </span>
        <span className="ct-stat-icon"><Icon style={{ width: 12, height: 12 }} strokeWidth={1.75} /></span>
      </div>
      <div className="ct-stat-value">{value}</div>
      {sub != null && (
        <div className="ct-stat-foot">
          <span className="ct-stat-sub">{sub}</span>
        </div>
      )}
    </div>
  )
}

// ── Tabs (ct-tabs sliding pill, matches invoices/quotes) ─────────────
function TabBar({ value, onChange }: { value: Tab; onChange: (v: Tab) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 })

  function measure() {
    const el = refs.current[value]
    if (!el) return
    setPillStyle({
      width: el.offsetWidth,
      transform: `translateX(${el.offsetLeft}px)`,
      opacity: 1,
    })
  }

  useLayoutEffect(() => {
    measure()
    const t1 = setTimeout(measure, 50)
    const t2 = setTimeout(measure, 300)
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      ;(document as any).fonts.ready.then(measure).catch(() => {})
    }
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t1); clearTimeout(t2)
      window.removeEventListener('resize', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'mileage',  label: 'Mileage' },
  ]

  return (
    <div className="ct-tabs">
      <span className="ct-tabs-pill" style={pillStyle} aria-hidden />
      {TABS.map(t => (
        <button
          key={t.id}
          ref={el => { refs.current[t.id] = el }}
          onClick={() => onChange(t.id)}
          className={`ct-tab ${value === t.id ? 'is-active' : ''}`}
          type="button"
        >
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function ExpensesPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const initialTab   = searchParams.get('tab') === 'mileage' ? 'mileage' : 'expenses'

  const [tab, setTab]               = useState<Tab>(initialTab as Tab)
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [mileage, setMileage]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [slideOpen, setSlideOpen]   = useState(false)
  const [editExpense, setEditExpense] = useState<Partial<Expense> | undefined>()
  const [userId, setUserId]         = useState('')
  const [vatRegistered, setVatRegistered] = useState(false)
  const [query, setQuery]           = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [canUseMileage, setCanUseMileage] = useState(false)
  const [hoverRow, setHoverRow]     = useState<string | null>(null)

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
    async (entry: any) => deleteMileageEntry(entry.id),
    (entry: any) => String(entry.description ?? 'Journey'),
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
  const totalMiles          = mileage.reduce((s, e) => s + Number(e.miles), 0)
  const totalMileageRelief  = calcMileageRelief(totalMiles)
  const visibleMileage      = mileage.filter(e => !mileageDeletePending.has(e.id))

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

  function openAdd() { setEditExpense(undefined); setSlideOpen(true) }

  const noExpensesAtAll = !loading && tab === 'expenses' && expenses.length === 0
  const noExpenseMatches = !loading && tab === 'expenses' && expenses.length > 0 && filtered.length === 0

  return (
    <div className="fd-page-enter">
      <PageHeader
        title="Expenses"
        subtitle={loading ? '' : tab === 'expenses'
          ? `${expenses.length} expense${expenses.length === 1 ? '' : 's'} · ${label}`
          : `${mileage.length} journey${mileage.length === 1 ? '' : 's'} · ${totalMiles.toLocaleString('en-GB')} mi`
        }
        action={
          !(tab === 'mileage' && !canUseMileage) && (
            <button onClick={openAdd} className="ct-btn ct-btn-primary" type="button">
              <Plus style={{ width: 14, height: 14 }} strokeWidth={2.25} />
              <span>{tab === 'expenses' ? 'Add expense' : 'Log journey'}</span>
            </button>
          )
        }
      />

      {/* Tab bar */}
      <div style={{ marginBottom: 18 }}>
        <TabBar value={tab} onChange={setTab} />
      </div>

      {/* ── Expenses tab ─────────────────────────────────────────── */}
      {tab === 'expenses' && !loading && (
        <>
          {/* Stat row */}
          <div className="ct-stat-row" style={{ marginBottom: 16 }}>
            <StatCard
              tone="neutral"
              label="Total ex-VAT"
              value={formatCurrency(totalExVat)}
              sub={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`}
              Icon={Coins}
            />
            <StatCard
              tone={vatRegistered ? 'success' : 'neutral'}
              label="VAT reclaimable"
              value={formatCurrency(totalVatReclaimable)}
              sub={vatRegistered ? 'Registered for VAT' : 'Not VAT registered'}
              Icon={Percent}
            />
            <StatCard
              tone={expenses.length > 0 && receiptsUploaded === expenses.length ? 'success' : expenses.length > 0 ? 'warn' : 'neutral'}
              label="Receipts uploaded"
              value={`${receiptsUploaded}/${expenses.length}`}
              sub={expenses.length === 0
                ? '—'
                : receiptsUploaded === expenses.length
                  ? '✓ All uploaded'
                  : `${expenses.length - receiptsUploaded} missing`}
              Icon={FileCheck2}
            />
            <StatCard
              tone="info"
              label="Tax year"
              value={label}
              sub={`6 Apr ${taxYearStart} – 5 Apr ${taxYearStart + 1}`}
              Icon={Receipt}
            />
          </div>

          {/* Search + category pills toolbar */}
          {expenses.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              flexWrap: 'wrap', rowGap: 10, marginBottom: 14,
            }}>
              <div className="ct-search" style={{ flex: '1 1 240px', maxWidth: 360, minWidth: 200 }}>
                <Search className="ct-search-icon" style={{ width: 14, height: 14 }} strokeWidth={1.75} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search merchant or category…"
                  className="ct-search-input"
                  onKeyDown={e => e.key === 'Escape' && setQuery('')}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="ct-search-clear"
                    aria-label="Clear search"
                    type="button"
                  >
                    <X style={{ width: 12, height: 12 }} strokeWidth={2} />
                  </button>
                )}
              </div>

              {categories.length > 1 && (
                <div style={{
                  display: 'flex', gap: 6, flexWrap: 'wrap',
                  flex: '1 1 auto', minWidth: 0, justifyContent: 'flex-end',
                }}>
                  {categories.map(cat => {
                    const isActive = categoryFilter === cat
                    const catLabel = cat === 'all' ? 'All' : (CATEGORY_LABELS[cat] ?? cat)
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat === categoryFilter && cat !== 'all' ? 'all' : cat)}
                        type="button"
                        style={{
                          padding: '5px 12px', height: 28, borderRadius: 7,
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${isActive ? 'var(--ct-brand)' : 'var(--ct-line)'}`,
                          background: isActive ? 'var(--ct-brand-soft)' : 'var(--ct-surface)',
                          color: isActive ? 'var(--ct-brand)' : 'var(--ct-ink-3)',
                          letterSpacing: '-0.005em',
                          transition: 'all 160ms',
                          fontFamily: 'inherit', whiteSpace: 'nowrap',
                        }}
                      >
                        {catLabel}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bulk bar */}
          {selected.size > 0 && (
            <BulkBar count={selected.size} onDelete={() => setBulkDeleteOpen(true)} onClear={() => setSelected(new Set())} />
          )}
        </>
      )}

      {/* Empty — no expenses at all */}
      {noExpensesAtAll && (
        <div className="ct-empty">
          <div className="ct-empty-icon">
            <Receipt style={{ width: 22, height: 22 }} strokeWidth={1.5} />
          </div>
          <h3 className="ct-empty-title">No expenses yet</h3>
          <p className="ct-empty-sub">
            Every business cost you log reduces your tax bill. We handle the VAT split and keep your receipts in one place for Self Assessment.
          </p>
          <button onClick={openAdd} className="ct-btn ct-btn-primary" style={{ marginTop: 14 }} type="button">
            <Plus style={{ width: 14, height: 14 }} strokeWidth={2.25} />
            <span>Log your first expense</span>
          </button>
        </div>
      )}

      {/* Empty — filter/search hides everything */}
      {noExpenseMatches && (
        <div className="ct-empty">
          <div className="ct-empty-icon">
            <Search style={{ width: 22, height: 22 }} strokeWidth={1.5} />
          </div>
          <h3 className="ct-empty-title">No matches</h3>
          <p className="ct-empty-sub">No expenses match your current filter or search.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
            {categoryFilter !== 'all' && (
              <button onClick={() => setCategoryFilter('all')} className="ct-btn ct-btn-sm" type="button">
                Clear filter
              </button>
            )}
            {query && (
              <button onClick={() => setQuery('')} className="ct-btn ct-btn-sm" type="button">
                Clear search
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expenses table — desktop */}
      {tab === 'expenses' && !noExpensesAtAll && !noExpenseMatches && (
        <>
          <div className="ct-table-wrap hidden md:block">
            <table className="ct-table">
              <thead>
                <tr>
                  <th className="ct-th-check">
                    <button
                      onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(e => e.id)))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ct-ink-3)', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      type="button"
                      aria-label={allSelected ? 'Clear selection' : 'Select all'}
                    >
                      {allSelected
                        ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--ct-ink)' }} strokeWidth={1.75} />
                        : <Square      style={{ width: 15, height: 15 }} strokeWidth={1.75} />}
                    </button>
                  </th>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>VAT</th>
                  <th style={{ textAlign: 'center', width: 60 }}>Receipt</th>
                  <th className="ct-th-action" />
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="ct-tr">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}>
                        <div style={{ height: 14, background: 'rgba(20,23,29,0.05)', borderRadius: 4, width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                )) : filtered.map(exp => {
                  const isSelected = selected.has(exp.id)
                  return (
                    <tr
                      key={exp.id}
                      className={`ct-tr ${hoverRow === exp.id ? 'is-hover' : ''} ${isSelected ? 'is-sel' : ''}`}
                      onMouseEnter={() => setHoverRow(exp.id)}
                      onMouseLeave={() => setHoverRow(prev => prev === exp.id ? null : prev)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(exp.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: isSelected ? 'var(--ct-ink)' : 'var(--ct-ink-3)', padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          type="button"
                          aria-label={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected
                            ? <CheckSquare style={{ width: 15, height: 15 }} strokeWidth={1.75} />
                            : <Square      style={{ width: 15, height: 15 }} strokeWidth={1.75} />}
                        </button>
                      </td>
                      <td style={{ color: 'var(--ct-ink-3)', whiteSpace: 'nowrap' }}>
                        {new Date(exp.date).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ct-ink)' }}>{exp.merchant}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 9px', borderRadius: 999,
                          fontSize: 11.5, fontWeight: 600,
                          background: CATEGORY_COLORS[exp.category] ?? 'var(--ct-line-soft)',
                          color: 'var(--ct-ink-2)',
                          border: '1px solid var(--ct-line)',
                          letterSpacing: '-0.005em',
                        }}>
                          {CATEGORY_LABELS[exp.category] ?? exp.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ct-ink)' }}>
                        {formatCurrency(exp.amount)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--ct-ink-3)' }}>
                        {exp.vat_reclaimable
                          ? <span style={{ color: 'var(--ct-success)', fontWeight: 600 }}>{formatCurrency(exp.vat_amount ?? 0)}</span>
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {exp.receipt_url ? (
                          <a
                            href={exp.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-grid', placeItems: 'center',
                              width: 26, height: 26, borderRadius: 6,
                              color: 'var(--ct-info)',
                              background: 'var(--ct-info-soft)',
                              border: '1px solid var(--ct-info-line)',
                              textDecoration: 'none',
                            }}
                            title="View receipt"
                          >
                            <Paperclip style={{ width: 12, height: 12 }} strokeWidth={1.75} />
                          </a>
                        ) : (
                          <Paperclip style={{ width: 13, height: 13, color: 'var(--ct-ink-4)', opacity: 0.4 }} strokeWidth={1.75} />
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="ct-tr-actions" style={{ opacity: hoverRow === exp.id ? 1 : 0, transform: hoverRow === exp.id ? 'translateX(0)' : 'translateX(8px)', pointerEvents: hoverRow === exp.id ? 'auto' : 'none' }}>
                          <KebabMenu
                            onEdit={() => { setEditExpense(exp); setSlideOpen(true) }}
                            onDelete={() => scheduleExpenseDelete(exp)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ct-panel" style={{ padding: 14 }}>
                <div style={{ height: 14, width: 96, background: 'rgba(20,23,29,0.05)', borderRadius: 4, marginBottom: 10 }} />
                <div style={{ height: 12, width: 128, background: 'rgba(20,23,29,0.05)', borderRadius: 4 }} />
              </div>
            )) : filtered.map(exp => {
              const isSelected = selected.has(exp.id)
              return (
                <div
                  key={exp.id}
                  className="ct-panel"
                  style={{
                    padding: 14,
                    borderColor: isSelected ? 'var(--ct-info-line)' : 'var(--ct-line)',
                    background: isSelected ? 'var(--ct-info-soft)' : 'var(--ct-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <button
                        onClick={() => toggleSelect(exp.id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                        type="button"
                        aria-label={isSelected ? 'Deselect' : 'Select'}
                      >
                        {isSelected
                          ? <CheckSquare style={{ width: 15, height: 15, color: 'var(--ct-ink)' }} strokeWidth={1.75} />
                          : <Square      style={{ width: 15, height: 15, color: 'var(--ct-ink-3)' }} strokeWidth={1.75} />}
                      </button>
                      <span style={{
                        fontWeight: 600, color: 'var(--ct-ink)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{exp.merchant}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--ct-ink)', flexShrink: 0 }}>{formatCurrency(exp.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6, paddingLeft: 25 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '2px 9px', borderRadius: 999,
                      fontSize: 11.5, fontWeight: 600,
                      background: CATEGORY_COLORS[exp.category] ?? 'var(--ct-line-soft)',
                      color: 'var(--ct-ink-2)',
                      border: '1px solid var(--ct-line)',
                    }}>
                      {CATEGORY_LABELS[exp.category] ?? exp.category}
                    </span>
                    {exp.vat_reclaimable && (
                      <span style={{ color: 'var(--ct-success)', fontWeight: 600, fontSize: 12 }}>
                        VAT {formatCurrency(exp.vat_amount ?? 0)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 25 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--ct-ink-4)' }}>
                      {new Date(exp.date).toLocaleDateString('en-GB')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {exp.receipt_url && (
                        <a
                          href={exp.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--ct-info)', display: 'inline-flex' }}
                          title="View receipt"
                        >
                          <Paperclip style={{ width: 13, height: 13 }} strokeWidth={1.75} />
                        </a>
                      )}
                      <KebabMenu
                        onEdit={() => { setEditExpense(exp); setSlideOpen(true) }}
                        onDelete={() => scheduleExpenseDelete(exp)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Mileage tab ──────────────────────────────────────────── */}
      {tab === 'mileage' && canUseMileage && !loading && (
        <>
          <div className="ct-stat-row" style={{ marginBottom: 14 }}>
            <StatCard
              tone="neutral"
              label="Total miles"
              value={
                <span>
                  {totalMiles.toLocaleString('en-GB')}
                  <span style={{ fontSize: '0.5em', fontWeight: 500, color: 'var(--ct-ink-4)', marginLeft: 6 }}>mi</span>
                </span>
              }
              sub={`${mileage.length} journey${mileage.length === 1 ? '' : 's'}`}
              Icon={Car}
            />
            <StatCard
              tone="success"
              label="Tax relief"
              value={formatCurrency(totalMileageRelief)}
              sub={`Earned this tax year`}
              Icon={Coins}
            />
            <StatCard
              tone="info"
              label="Current rate"
              value={
                <span>
                  {(calcMileageRate(totalMiles) * 100).toFixed(0)}
                  <span style={{ fontSize: '0.5em', fontWeight: 500, color: 'var(--ct-ink-4)', marginLeft: 4 }}>p / mile</span>
                </span>
              }
              sub={totalMiles >= HMRC_THRESHOLD ? 'Above 10k threshold' : 'Standard rate'}
              Icon={Gauge}
            />
            <StatCard
              tone="info"
              label="Tax year"
              value={label}
              sub={`6 Apr ${taxYearStart} – 5 Apr ${taxYearStart + 1}`}
              Icon={Receipt}
            />
          </div>

          {/* HMRC rate banner */}
          <div className="ct-panel" style={{
            padding: '12px 16px',
            background: 'var(--ct-info-soft)',
            borderColor: 'var(--ct-info-line)',
            marginBottom: 18,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{
              display: 'inline-grid', placeItems: 'center',
              width: 24, height: 24, borderRadius: 6,
              background: 'rgba(31,79,138,0.12)',
              border: '1px solid var(--ct-info-line)',
              color: 'var(--ct-info)', flexShrink: 0,
            }}>
              <Gauge style={{ width: 13, height: 13 }} strokeWidth={1.75} />
            </span>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ct-ink-2)', lineHeight: 1.55, letterSpacing: '-0.005em' }}>
              HMRC approved mileage:{' '}
              <strong style={{ color: 'var(--ct-ink)' }}>{(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile</strong> first {HMRC_THRESHOLD.toLocaleString()} miles,
              then <strong style={{ color: 'var(--ct-ink)' }}>{(HMRC_RATE_AFTER * 100).toFixed(0)}p/mile</strong>.
              {totalMiles > 8000 && totalMiles < HMRC_THRESHOLD && (
                <span style={{ marginLeft: 6, color: 'var(--ct-warn)', fontWeight: 600 }}>
                  {(HMRC_THRESHOLD - totalMiles).toLocaleString()} miles from the rate change.
                </span>
              )}
            </p>
          </div>
        </>
      )}

      {/* Mileage table */}
      {tab === 'mileage' && canUseMileage && (
        !loading && !mileage.length ? (
          <div className="ct-empty">
            <div className="ct-empty-icon">
              <Car style={{ width: 22, height: 22 }} strokeWidth={1.5} />
            </div>
            <h3 className="ct-empty-title">No journeys logged yet</h3>
            <p className="ct-empty-sub">
              Business mileage at {(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile is tax-deductible — every journey reduces your bill.
            </p>
            <button onClick={openAdd} className="ct-btn ct-btn-primary" style={{ marginTop: 14 }} type="button">
              <Plus style={{ width: 14, height: 14 }} strokeWidth={2.25} />
              <span>Log journey</span>
            </button>
          </div>
        ) : (
          <>
            <div className="ct-table-wrap hidden md:block">
              <table className="ct-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Route</th>
                    <th style={{ textAlign: 'right' }}>Miles</th>
                    <th style={{ textAlign: 'right' }}>Relief</th>
                    <th className="ct-th-action" />
                  </tr>
                </thead>
                <tbody>
                  {visibleMileage.map((e, idx) => {
                    const milesBefore = visibleMileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
                    const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
                    const relief = Number(e.miles) * rate
                    return (
                      <tr
                        key={e.id}
                        className={`ct-tr ${hoverRow === e.id ? 'is-hover' : ''}`}
                        onMouseEnter={() => setHoverRow(e.id)}
                        onMouseLeave={() => setHoverRow(prev => prev === e.id ? null : prev)}
                      >
                        <td style={{ color: 'var(--ct-ink-3)', whiteSpace: 'nowrap' }}>
                          {new Date(e.date).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ct-ink)' }}>{e.description}</td>
                        <td style={{ color: 'var(--ct-ink-3)', fontSize: 12 }}>
                          {e.from_location && e.to_location
                            ? `${e.from_location} → ${e.to_location}`
                            : e.from_location || e.to_location || '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ct-ink)' }}>
                          {Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--ct-success)', fontWeight: 600 }}>
                          £{relief.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="ct-tr-actions" style={{ opacity: hoverRow === e.id ? 1 : 0, transform: hoverRow === e.id ? 'translateX(0)' : 'translateX(8px)', pointerEvents: hoverRow === e.id ? 'auto' : 'none' }}>
                            <button
                              onClick={() => scheduleMileageDelete(e)}
                              className="ct-iconbtn"
                              style={{ width: 28, height: 28, color: 'var(--ct-ink-3)' }}
                              title="Delete journey"
                              type="button"
                              onMouseEnter={ev => { (ev.currentTarget as HTMLButtonElement).style.color = 'var(--ct-danger)' }}
                              onMouseLeave={ev => { (ev.currentTarget as HTMLButtonElement).style.color = 'var(--ct-ink-3)' }}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--ct-surface-2)', borderTop: '1px solid var(--ct-line)' }}>
                    <td colSpan={3} style={{
                      padding: '12px 14px', paddingLeft: 18,
                      fontSize: 10.5, fontWeight: 700,
                      color: 'var(--ct-ink-3)',
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                    }}>Total</td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: 'var(--ct-ink)' }}>
                      {totalMiles.toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700, color: 'var(--ct-success)' }}>
                      £{totalMileageRelief.toFixed(2)}
                    </td>
                    <td style={{ paddingRight: 18 }} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile mileage cards */}
            <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleMileage.map((e, idx) => {
                const milesBefore = visibleMileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
                const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
                const relief = Number(e.miles) * rate
                const hasRoute = e.from_location || e.to_location
                return (
                  <div key={e.id} className="ct-panel" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ct-ink)' }}>{e.description}</span>
                      <span style={{ fontWeight: 700, color: 'var(--ct-ink)', flexShrink: 0 }}>
                        {Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px', color: 'var(--ct-success)', fontWeight: 600, fontSize: 13 }}>
                      {formatCurrency(relief)} tax relief
                    </p>
                    {hasRoute && (
                      <p style={{ margin: '0 0 6px', fontSize: 11.5, color: 'var(--ct-ink-3)' }}>
                        {e.from_location && e.to_location
                          ? `${e.from_location} → ${e.to_location}`
                          : e.from_location || e.to_location}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--ct-ink-4)' }}>
                        {new Date(e.date).toLocaleDateString('en-GB')}
                      </span>
                      <button
                        onClick={() => scheduleMileageDelete(e)}
                        className="ct-iconbtn"
                        style={{ width: 28, height: 28, color: 'var(--ct-ink-3)' }}
                        title="Delete journey"
                        type="button"
                      >
                        <Trash2 style={{ width: 13, height: 13 }} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      )}

      {/* Mileage locked state */}
      {tab === 'mileage' && !canUseMileage && !loading && (
        <div className="ct-empty">
          <div className="ct-empty-icon">
            <Lock style={{ width: 22, height: 22 }} strokeWidth={1.5} />
          </div>
          <h3 className="ct-empty-title">Mileage tracking is on Solo and above</h3>
          <p className="ct-empty-sub">
            Track business journeys at HMRC&rsquo;s approved rate and watch tax relief add up automatically.
          </p>
          <Link href="/settings?tab=billing" className="ct-btn ct-btn-primary" style={{ marginTop: 14 }}>
            <span>Upgrade to Solo</span>
            <ArrowRight style={{ width: 13, height: 13 }} strokeWidth={2} />
          </Link>
        </div>
      )}

      {bulkDeleteOpen && (
        <DeleteModal
          count={selected.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
          loading={bulkDeleting}
        />
      )}

      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={tab === 'expenses' ? (editExpense ? 'Edit expense' : 'Add expense') : 'Log journey'}
      >
        {tab === 'expenses'
          ? <ExpenseForm expense={editExpense} vatRegistered={vatRegistered} onSuccess={() => { setSlideOpen(false); load() }} />
          : <MileageForm userId={userId} taxYearStart={taxYearStart} onSuccess={() => { setSlideOpen(false); load() }} />
        }
      </SlideOver>
    </div>
  )
}
