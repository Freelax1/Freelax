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
import { Paperclip, Trash2, Car, MoreVertical, Pencil, CheckSquare, Square } from 'lucide-react'
import type { Expense } from '@/types/database'

type Tab = 'expenses' | 'mileage'

// ── Delete modal ──────────────────────────────────────────────────────
function DeleteModal({ count, onConfirm, onCancel, loading }: {
  count?: number; onConfirm: () => void; onCancel: () => void; loading: boolean
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
            <h2 className="font-bold text-slate-900">{count && count > 1 ? `Delete ${count} expenses?` : 'Delete expense?'}</h2>
            <p className="text-sm text-slate-500 mt-0.5">This will be permanently removed.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
          minWidth: 130, overflow: 'hidden',
        }}>
          <button onClick={() => { setOpen(false); onEdit() }}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 w-full text-left">
            <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit
          </button>
          <div style={{ borderTop: '1px solid #F1F5F9' }}>
            <button onClick={() => { setOpen(false); onDelete() }}
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
function BulkBar({ count, onDelete, onClear }: {
  count: number; onDelete: () => void; onClear: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0F172A', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginRight: 4 }}>{count} selected</span>
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
      <button onClick={onClear} style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'expense' | 'mileage' } | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [userId, setUserId]         = useState('')
  const [vatRegistered, setVatRegistered] = useState(false)
  const [query, setQuery]           = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { start, end, label } = getCurrentTaxYear()
  const taxYearStart = start.getFullYear()

  async function load() {
    const user    = await fetchCurrentUser()
    const profile = user ? await fetchUserProfile(user.id) : null
    if (user) setUserId(user.id)
    setVatRegistered(!!profile?.vat_registered)
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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'expense') await deleteExpense(deleteTarget.id)
      else await deleteMileageEntry(deleteTarget.id)
      setDeleteTarget(null); load()
    } finally { setDeleting(false) }
  }

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
    return matchesQuery && matchesCategory
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
          <button onClick={openAdd} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
            {tab === 'expenses' ? 'Add expense' : 'Log journey'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {(['expenses', 'mileage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
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
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
                <p style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 2 }}>{s.value}</p>
                <p style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Category filter pills */}
          {categories.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {categories.map(cat => {
                const isActive = categoryFilter === cat
                const label = cat === 'all' ? 'All categories' : (CATEGORY_LABELS[cat] ?? cat)
                return (
                  <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter && cat !== 'all' ? 'all' : cat)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${isActive ? '#111' : '#E0E0E0'}`,
                    background: isActive ? '#111' : '#fff',
                    color: isActive ? '#fff' : '#666',
                    fontWeight: isActive ? 600 : 400, transition: 'all 0.12s',
                  }}>{label}</button>
                )
              })}
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 14, maxWidth: 360 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#AAA' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search expenses..."
              style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E2E2', borderRadius: 10, fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit', color: '#111', boxSizing: 'border-box' as const }}
              onKeyDown={e => e.key === 'Escape' && setQuery('')}
            />
            {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', fontSize: 16 }}>×</button>}
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
            action={<button onClick={openAdd} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Log your first expense</button>}
          />
        ) : (
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(e => e.id)))}
                      className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  {['Date', 'Merchant', 'Category', 'Amount', 'VAT', 'Receipt', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 font-medium text-slate-600 ${h === 'Amount' || h === 'VAT' ? 'text-right' : h === '' ? 'w-10' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>)}</tr>
                )) : filtered.map(exp => {
                  const isSelected = selected.has(exp.id)
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50" style={{ background: isSelected ? '#F8FAFC' : undefined }}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(exp.id)} className="flex items-center justify-center text-slate-400 hover:text-slate-700">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{exp.merchant}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: CATEGORY_COLORS[exp.category] ?? '#F0F0F0', color: '#333' }}>
                          {CATEGORY_LABELS[exp.category] ?? exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {exp.vat_reclaimable ? <span className="text-green-700 font-medium">{formatCurrency(exp.vat_amount ?? 0)}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exp.receipt_url
                          ? <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700"><Paperclip className="w-3.5 h-3.5 inline" /></a>
                          : <span className="text-slate-200"><Paperclip className="w-3.5 h-3.5 inline" /></span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        <KebabMenu
                          onEdit={() => { setEditExpense(exp); setSlideOpen(true) }}
                          onDelete={() => setDeleteTarget({ id: exp.id, type: 'expense' })}
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
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="h-4 fd-skeleton w-24 mb-3" /><div className="h-3 fd-skeleton w-32" />
            </div>
          )) : filtered.map(exp => {
            const isSelected = selected.has(exp.id)
            return (
              <div key={exp.id} className={`bg-white rounded-xl border p-4 ${isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => toggleSelect(exp.id)} className="flex items-center flex-shrink-0">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-slate-900" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                    <span className="font-medium text-slate-800 truncate">{exp.merchant}</span>
                  </div>
                  <span className="font-semibold text-slate-900 flex-shrink-0">{formatCurrency(exp.amount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 mb-2 pl-7">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{ background: CATEGORY_COLORS[exp.category] ?? '#F0F0F0', color: '#333' }}>
                    {CATEGORY_LABELS[exp.category] ?? exp.category}
                  </span>
                  {exp.vat_reclaimable && <span className="text-green-700 font-medium text-xs">VAT {formatCurrency(exp.vat_amount ?? 0)}</span>}
                </div>
                <div className="flex items-center justify-between pl-7">
                  <span className="text-xs text-slate-400">{new Date(exp.date).toLocaleDateString('en-GB')}</span>
                  <div className="flex items-center gap-2">
                    {exp.receipt_url && <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-500"><Paperclip className="w-3.5 h-3.5" /></a>}
                    <KebabMenu onEdit={() => { setEditExpense(exp); setSlideOpen(true) }} onDelete={() => setDeleteTarget({ id: exp.id, type: 'expense' })} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      {/* Mileage tab */}
      {tab === 'mileage' && !loading && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total miles',  value: `${totalMiles.toLocaleString('en-GB')} mi` },
              { label: 'Tax relief',   value: formatCurrency(totalMileageRelief) },
              { label: 'Current rate', value: `${(calcMileageRate(totalMiles) * 100).toFixed(0)}p/mile` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
                <p style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 mb-5">
            HMRC approved mileage: <strong className="text-slate-700">{(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile</strong> first {HMRC_THRESHOLD.toLocaleString()} miles,
            then <strong className="text-slate-700">{(HMRC_RATE_AFTER * 100).toFixed(0)}p/mile</strong>.
            {totalMiles > 8000 && totalMiles < HMRC_THRESHOLD && (
              <span className="ml-2 text-amber-700 font-medium">{(HMRC_THRESHOLD - totalMiles).toLocaleString()} miles from the rate change.</span>
            )}
          </div>
        </>
      )}

      {tab === 'mileage' && (
        !loading && !mileage.length ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Car className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium mb-1">No journeys logged yet</p>
            <p className="text-slate-400 text-xs">Business mileage at {(HMRC_RATE_FIRST * 100).toFixed(0)}p/mile is tax-deductible.</p>
            <button onClick={openAdd} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Log journey</button>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Date', 'Description', 'Route', 'Miles', 'Relief', ''].map((h, i) => (
                      <th key={i} className={`px-4 py-3 font-medium text-slate-600 ${h === 'Miles' || h === 'Relief' ? 'text-right' : h === '' ? 'w-10' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mileage.map((e, idx) => {
                    const milesBefore = mileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
                    const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
                    const relief = Number(e.miles) * rate
                    return (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{e.description}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {e.from_location && e.to_location ? `${e.from_location} → ${e.to_location}` : e.from_location || e.to_location || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })}</td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">£{relief.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setDeleteTarget({ id: e.id, type: 'mileage' })}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{totalMiles.toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">£{totalMileageRelief.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {mileage.map((e, idx) => {
                const milesBefore = mileage.slice(idx + 1).reduce((s, x) => s + Number(x.miles), 0)
                const rate   = milesBefore >= HMRC_THRESHOLD ? HMRC_RATE_AFTER : HMRC_RATE_FIRST
                const relief = Number(e.miles) * rate
                const hasRoute = e.from_location || e.to_location
                return (
                  <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-medium text-slate-800">{e.description}</span>
                      <span className="font-semibold text-slate-900 flex-shrink-0">{Number(e.miles).toLocaleString('en-GB', { minimumFractionDigits: 1 })} mi</span>
                    </div>
                    <p className="text-green-700 font-medium text-sm mb-2">{formatCurrency(relief)} tax relief</p>
                    {hasRoute && (
                      <p className="text-xs text-slate-400 mb-2">
                        {e.from_location && e.to_location ? `${e.from_location} → ${e.to_location}` : e.from_location || e.to_location}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString('en-GB')}</span>
                      <button onClick={() => setDeleteTarget({ id: e.id, type: 'mileage' })}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      )}

      {deleteTarget && <DeleteModal onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
      {bulkDeleteOpen && <DeleteModal count={selected.size} onConfirm={handleBulkDelete} onCancel={() => setBulkDeleteOpen(false)} loading={bulkDeleting} />}

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
