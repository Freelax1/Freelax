'use client'

import { useState, useEffect } from 'react'
import { fetchCurrentUser, fetchUserProfile } from '@/lib/api/users'
import { fetchPaidInvoicesByUser } from '@/lib/api/invoices'
import { fetchExpensesByUser } from '@/lib/api/expenses'
import {
  formatCurrency,
  calculateTax,
  getCurrentTaxYear,
  getVatThresholdWarning,
} from '@/lib/tax-calculations'
import PageHeader from '@/components/page-header'
import NotTaxAdviceDisclaimer from '@/components/not-tax-advice'
import AIFlag from '@/components/ai-flag'
import { fetchTaxPotTotal, fetchTaxPotEntries, addTaxPotEntry } from '@/lib/api/tax-pot'
import { createClient } from '@/lib/supabase/client'
import { fetchMileageEntries, calcMileageRelief } from '@/lib/api/mileage'
import { Sparkles, Download, Loader2, AlertTriangle, Info, X, ArrowRight, Zap, RotateCcw } from 'lucide-react'
import InfoTooltip from '@/components/info-tooltip'
import Link from 'next/link'
import type {
  TaxPotEntry, Invoice, Expense, MileageEntry,
  BusinessType, StudentLoanPlan, TaxDetail,
} from '@/types/database'

type PaidInvoiceRow = {
  id: string
  invoice_number: string
  total: number
  vat_amount: number
  paid_date: string | null
  clients: { name: string } | { name: string }[] | null
}

type TaxPageData = {
  paidInvoices:      PaidInvoiceRow[]
  totalIncomeExVat:  number
  totalVatCollected: number
  totalExpenses:     number
  vatReclaimable:    number
  vatWarning:        string | null
  taxDetail:         TaxDetail
  hasTaxProfile:     boolean
  businessType:      BusinessType
  vatRegistered:     boolean
  mileageRelief:     number
  mileageMiles:      number
}

// ── helpers ───────────────────────────────────────────────────────────────────
function Row({ label, value, bold, red, green, indent, hint }: {
  label: React.ReactNode; value: string; bold?: boolean; red?: boolean
  green?: boolean; indent?: boolean; hint?: string
}) {

  return (
    <div className={`flex justify-between items-start py-2 border-b border-slate-50 last:border-0 ${indent ? 'pl-4' : ''}`}>
      <div>
        <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{label}</span>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <span className={`text-sm ml-4 shrink-0 ${bold ? 'font-semibold' : 'font-medium'} ${red ? 'text-red-600' : green ? 'text-green-700' : bold ? 'text-slate-900' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  )
}

function Card({ title, accent, children }: { title: React.ReactNode; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className={`px-5 py-3 border-b border-slate-100 ${accent ?? 'bg-slate-50'}`}>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

// ── Dashboard-style KPI card ───────────────────────────────────────────
function StatCard({
  label, value, sub, valueColor, tone = 'white', progressBar,
}: {
  label:       string
  value:       React.ReactNode
  sub?:        React.ReactNode
  valueColor?: string
  tone?:       'white' | 'cream'
  progressBar?: { pct: number; color: string }
}) {
  return (
    <div style={{
      background: tone === 'cream' ? '#F5F4EE' : '#fff',
      borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.06)',
      padding: '22px 22px 20px',
      display: 'flex', flexDirection: 'column',
    }}>
      <p style={{
        fontSize: 11, fontWeight: 500, color: '#94A3B8',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        margin: '0 0 12px',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 'clamp(22px, 3.4vw, 28px)', fontWeight: 700,
        color: valueColor ?? '#0F172A',
        letterSpacing: '-0.02em', lineHeight: 1,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontVariantNumeric: 'tabular-nums',
        margin: 0,
      }}>
        {value}
      </p>
      {progressBar && (
        <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden', marginTop: 12 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: progressBar.color,
            width: `${progressBar.pct}%`,
            transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
      )}
      {sub && (
        <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5, margin: '8px 0 0' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ── "What to do next" action card ──────────────────────────────────────
interface TaxAction {
  priority: 'red' | 'amber' | 'green' | 'info'
  title:    string
  sub:      string
  href:     string
}

function NextSteps({ actions }: { actions: TaxAction[] }) {
  if (!actions.length) return null

  const allGreen = actions.every(a => a.priority === 'green')
  const hasRed   = actions.some(a => a.priority === 'red')

  const bg     = allGreen ? '#F0FDF4'  : hasRed ? '#FEF2F2'  : '#FFFDF5'
  const border = allGreen ? 'rgba(29,107,53,0.20)'  : hasRed ? 'rgba(192,57,43,0.25)'  : 'rgba(245,226,155,0.6)'
  const accent = allGreen ? '#1D6B35'  : hasRed ? '#C0392B'  : '#9A7B0A'
  const label  = allGreen ? 'On track' : hasRed ? 'Act soon' : 'What to do next'

  const dotColor = (p: TaxAction['priority']) =>
    p === 'red'   ? '#C0392B' :
    p === 'amber' ? '#9A7B0A' :
    p === 'green' ? '#1D6B35' :
                    '#64748B'

  return (
    <div style={{
      background: bg,
      borderRadius: 14,
      border: `1px solid ${border}`,
      padding: '18px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <Zap style={{ width: 12, height: 12, color: accent }} strokeWidth={2} />
        <p style={{ fontSize: 11, fontWeight: 500, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
          {label}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {actions.map((a, i) => (
          <Link key={i} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: dotColor(a.priority) }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1E293B', margin: 0 }}>{a.title}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '1px 0 0' }}>{a.sub}</p>
            </div>
            <ArrowRight style={{ width: 12, height: 12, color: '#CBD5E1', flexShrink: 0 }} strokeWidth={1.75} />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

function TaxPotCard({
  totalTarget, totalSaved, entries,
  potAmount, setPotAmount,
  potNote, setPotNote,
  savingPot, onAdd, onDelete,
}: {
  totalTarget: number
  totalSaved:  number
  entries:     TaxPotEntry[]
  potAmount:   string; setPotAmount: (v: string) => void
  potNote:     string; setPotNote:   (v: string) => void
  savingPot:   boolean
  onAdd:       () => void
  onDelete:    (id: string) => void
}) {
  return (
    <Card title="Tax Pot">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-slate-500">Target</span>
        <span className="text-sm font-semibold">{formatCurrency(totalTarget)}</span>
      </div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-500">Already set aside</span>
        <span className={`text-sm font-semibold ${totalSaved >= totalTarget ? 'text-green-700' : 'text-slate-800'}`}>
          {formatCurrency(totalSaved)}
          {totalSaved >= totalTarget && <span className="text-xs font-normal ml-1">✓ On track</span>}
        </span>
      </div>
      {/* Progress bar */}
      {totalTarget > 0 && (
        <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: totalSaved >= totalTarget ? '#1D6B35' : totalSaved / totalTarget > 0.6 ? '#9A7B0A' : '#C0392B',
            width: `${Math.min(100, Math.round((totalSaved / totalTarget) * 100))}%`,
            transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
      )}
      {entries.map((e: TaxPotEntry) => (
        <div key={e.id} className="flex justify-between items-center text-xs text-slate-400 mb-1 group">
          <span>{e.note || 'Contribution'} · {new Date(e.date).toLocaleDateString('en-GB')}</span>
          <div className="flex items-center gap-2">
            <span>+{formatCurrency(e.amount)}</span>
            <button
              onClick={() => onDelete(e.id)}
              title="Remove this entry"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 hover:text-red-500 text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
      {totalTarget > totalSaved && (
        <p className="text-xs text-amber-700 mt-1">
          {formatCurrency(totalTarget - totalSaved)} still to set aside
        </p>
      )}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-3">
        <input
          type="number" min="0" placeholder="Add amount (£)"
          value={potAmount} onChange={e => setPotAmount(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-w-0"
        />
        <input
          placeholder="Note (optional)"
          value={potNote} onChange={e => setPotNote(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-w-0"
        />
        <button
          onClick={onAdd}
          disabled={savingPot || !potAmount || Number(potAmount) <= 0}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
        >
          {savingPot ? '…' : '+ Save'}
        </button>
      </div>
    </Card>
  )
}

// ── SA narrative parser ──────────────────────────────────────────────────────
const NARRATIVE_SECTION_HEADERS = ['SNAPSHOT', 'BASED ON', "WHAT'S GOING WELL", 'WHERE TO IMPROVE', 'TAX REDUCTION OPPORTUNITIES', 'KEY DEADLINE']
const NARRATIVE_BULLET_SECTIONS = new Set(["WHAT'S GOING WELL", 'WHERE TO IMPROVE', 'TAX REDUCTION OPPORTUNITIES'])

function parseNarrativeSections(text: string): { header: string; content: string }[] {
  const sections: { header: string; content: string }[] = []
  let currentHeader = ''
  let currentLines: string[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (NARRATIVE_SECTION_HEADERS.includes(trimmed)) {
      if (currentHeader) sections.push({ header: currentHeader, content: currentLines.join('\n').trim() })
      currentHeader = trimmed
      currentLines = []
    } else if (currentHeader) {
      currentLines.push(line)
    }
  }
  if (currentHeader) sections.push({ header: currentHeader, content: currentLines.join('\n').trim() })
  return sections
}

export default function TaxPage() {
  const [pageData, setPageData]             = useState<TaxPageData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [narrative, setNarrative]           = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const { start, end, label }               = getCurrentTaxYear()
  const taxYearStart = start.getFullYear()
  const [taxPotTotal, setTaxPotTotal]       = useState(0)
  const [taxPotEntries, setTaxPotEntries]   = useState<any[]>([])
  const [potAmount, setPotAmount]           = useState('')
  const [potNote, setPotNote]               = useState('')
  const [savingPot, setSavingPot]           = useState(false)
  const [exportLoading, setExportLoading]   = useState(false)

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`fd_sa_narrative_${taxYearStart}`)
      if (cached) setNarrative(cached)
    } catch {}
  }, [taxYearStart])

  useEffect(() => {
    async function load() {
      const user   = await fetchCurrentUser()
      const userId = user?.id ?? ''

      const [paidInvoices, expenses, profile] = await Promise.all([
        fetchPaidInvoicesByUser(userId, start, end),
        fetchExpensesByUser(userId, start, end),
        fetchUserProfile(userId),
      ])

      type InvRow = { total: number; vat_amount: number }
      type ExpRow = { amount: number; vat_amount: number; vat_reclaimable: boolean }
      const totalIncomeExVat  = paidInvoices?.reduce((s: number, i: InvRow) => s + (Number(i.total) - Number(i.vat_amount)), 0) ?? 0
      const totalVatCollected = paidInvoices?.reduce((s: number, i: InvRow) => s + Number(i.vat_amount), 0) ?? 0
      const totalExpenses     = expenses?.reduce((s: number, e: ExpRow) => s + Number(e.amount), 0) ?? 0
      const vatReclaimable    = expenses?.filter((e: ExpRow) => e.vat_reclaimable).reduce((s: number, e: ExpRow) => s + Number(e.vat_amount), 0) ?? 0

      const baseInputsObj = {
        grossIncome:          totalIncomeExVat,
        totalExpenses,
        businessType:         (profile?.business_type ?? 'sole_trader') as BusinessType,
        pensionContributions: Number(profile?.pension_contributions ?? 0),
        studentLoanPlan:      (profile?.student_loan_plan ?? 'none') as StudentLoanPlan,
        salaryDrawn:          profile?.salary_drawn ? Number(profile.salary_drawn) : undefined,
        dividendsDrawn:       profile?.dividends_drawn ? Number(profile.dividends_drawn) : undefined,
      }

      const otherIncomeVal         = Number((profile as any)?.other_income ?? 0)
      const investmentDividendsVal = Number((profile as any)?.investment_dividends ?? 0)

      const taxDetail = calculateTax({ ...baseInputsObj, otherIncome: otherIncomeVal, investmentDividends: investmentDividendsVal })
      const vatWarning = getVatThresholdWarning(totalIncomeExVat)

      // Banner hides if the user has explicitly set their tax profile (student_loan_plan not null)
      // even if they selected "none" — that means they visited settings and confirmed it
      const hasTaxProfile = profile?.student_loan_plan !== null && profile?.student_loan_plan !== undefined

      const mileageData   = await fetchMileageEntries(userId, taxYearStart)
      const mileageMiles  = mileageData.reduce((s: number, e: MileageEntry) => s + Number(e.miles), 0)
      const mileageRelief = calcMileageRelief(mileageMiles)

      setPageData({
        paidInvoices, totalIncomeExVat, totalVatCollected,
        totalExpenses, vatReclaimable, vatWarning,
        taxDetail, hasTaxProfile,
        businessType:  profile?.business_type ?? 'sole_trader',
        vatRegistered: !!profile?.vat_registered,
        mileageRelief,
        mileageMiles,
      })
      // Fetch tax pot
      const [potTotal, potEntries] = await Promise.all([
        fetchTaxPotTotal(userId, taxYearStart),
        fetchTaxPotEntries(userId, taxYearStart),
      ])
      setTaxPotTotal(potTotal)
      setTaxPotEntries(potEntries)

      setLoading(false)
    }
    load()
  }, [])

  async function generateNarrative(force = false) {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(`fd_sa_narrative_${taxYearStart}`)
        if (cached) { setNarrative(cached); return }
      } catch {}
    }
    setNarrativeLoading(true)
    setNarrative(null)
    try {
      const res = await fetch('/api/ai/sa-narrative', { method: 'POST' })
      const json = await res.json()
      const text = json.narrative ?? json.error ?? 'Could not generate summary.'
      setNarrative(text)
      try { sessionStorage.setItem(`fd_sa_narrative_${taxYearStart}`, text) } catch {}
    } catch { setNarrative('Failed to connect. Please try again.') }
    setNarrativeLoading(false)
  }

  const exportCSV = (type: string) => { window.location.href = `/api/invoices/export?type=${type}` }
  const endYear = new Date(end).getFullYear()

  async function addPotContribution() {
    if (!potAmount || Number(potAmount) <= 0) return
    setSavingPot(true)
    try {
      const user = await fetchCurrentUser()
      const uid  = user?.id ?? ''
      await addTaxPotEntry({
        user_id:        uid,
        amount:         Number(potAmount),
        note:           potNote.trim() || undefined,
        date:           new Date().toISOString().slice(0, 10),
        tax_year_start: taxYearStart,
      })
      const [newTotal, newEntries] = await Promise.all([
        fetchTaxPotTotal(uid, taxYearStart),
        fetchTaxPotEntries(uid, taxYearStart),
      ])
      setTaxPotTotal(newTotal)
      setTaxPotEntries(newEntries)
      setPotAmount('')
      setPotNote('')
    } catch (e) { console.error(e) }
    setSavingPot(false)
  }

  async function deletePotEntry(id: string) {
    const supabase = createClient()
    await supabase.from('tax_pot_entries').delete().eq('id', id)
    const user = await fetchCurrentUser()
    const uid  = user?.id ?? ''
    const [newTotal, newEntries] = await Promise.all([
      fetchTaxPotTotal(uid, taxYearStart),
      fetchTaxPotEntries(uid, taxYearStart),
    ])
    setTaxPotTotal(newTotal)
    setTaxPotEntries(newEntries)
  }

  async function downloadSAPack() {
    setExportLoading(true)
    try {
      window.location.href = '/api/tax/export-pack'
      // Give browser a moment to initiate the download before resetting state
      setTimeout(() => setExportLoading(false), 1500)
    } catch (e) {
      console.error(e)
      setExportLoading(false)
    }
  }


  return (
    <div className="space-y-6 fd-page-enter">
      <PageHeader
        title="Tax"
        subtitle={`Tax year ${label} · 6 Apr – 5 Apr`}
        action={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={downloadSAPack}
              disabled={exportLoading || loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exportLoading ? 'Preparing…' : `Download ${label} SA pack`}
            </button>

            <button onClick={() => generateNarrative()} disabled={narrativeLoading || loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {narrativeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              SA Summary
            </button>
          </div>
        }
      />

      <NotTaxAdviceDisclaimer />

      {(narrative || narrativeLoading) && (
        <div className="bg-slate-900 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Self Assessment Summary</span>
            <div className="ml-auto flex items-center gap-2">
              {narrative && !narrativeLoading && <AIFlag />}
              {!narrativeLoading && (
                <>
                  {narrative && (
                    <button
                      onClick={() => generateNarrative(true)}
                      title="Refresh"
                      className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setNarrative(null)}
                    title="Dismiss"
                    className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
          {narrativeLoading ? (
            <div className="space-y-2">
              <div className="h-3 bg-slate-700 rounded animate-pulse w-full" />
              <div className="h-3 bg-slate-700 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-slate-700 rounded animate-pulse w-4/6" />
              <div className="h-3 bg-slate-700 rounded animate-pulse w-11/12 mt-3" />
              <div className="h-3 bg-slate-700 rounded animate-pulse w-4/5" />
              <div className="h-3 bg-slate-700 rounded animate-pulse w-3/5" />
            </div>
          ) : (
            <div className="text-sm text-slate-100 leading-relaxed">
              {(() => {
                const sections = parseNarrativeSections(narrative ?? '')
                if (!sections.length) return <p>{narrative}</p>
                return (
                  <div>
                    {sections.map(({ header, content }, i) => {
                      const isBullet = NARRATIVE_BULLET_SECTIONS.has(header)
                      const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
                      return (
                        <div key={header}>
                          {i > 0 && (
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0' }} />
                          )}
                          <p style={{
                            fontSize: 10, fontWeight: 600,
                            color: 'rgba(255,255,255,0.4)',
                            textTransform: 'uppercase', letterSpacing: '0.1em',
                            marginBottom: 6,
                          }}>
                            {header}
                          </p>
                          {isBullet ? (
                            <ul className="space-y-1.5">
                              {lines.map((l, j) => (
                                <li key={j} className="flex gap-2">
                                  <span style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>•</span>
                                  <span>{l.replace(/^[-•]\s*/, '')}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ lineHeight: 1.65 }}>{content}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {loading || !pageData ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-xl border border-slate-200 fd-skeleton" />)}
        </div>
      ) : (
        <>
          {/* Tax profile nudge */}
          {!pageData.hasTaxProfile && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                For a precise take-home figure, add your student loan plan and pension contributions in{' '}
                <a href="/settings" className="underline font-medium">Settings → Tax Profile</a>.
              </p>
            </div>
          )}


          {/* Empty state — no income data yet */}
          {pageData.taxDetail.grossIncome === 0 && pageData.taxDetail.totalExpenses === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Your tax summary will appear here
              </h3>
              <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
                Log some invoices and expenses and we'll calculate your estimated Income Tax, National Insurance, and Corporation Tax — broken down clearly, with every deduction shown.
              </p>
              <Link href="/invoices/new"
                className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                Send your first invoice →
              </Link>
            </div>
          )}

          {/* ── Tax dashboard — at-a-glance KPIs + next steps ─────────── */}
          {(pageData.taxDetail.grossIncome > 0 || pageData.taxDetail.totalExpenses > 0) && (() => {
            const t        = pageData.taxDetail
            const taxTotal = t.kind === 'sole_trader' ? t.totalTax : t.totalPersonalTax
            const potPct   = taxTotal > 0 ? Math.min(100, Math.round((taxPotTotal / taxTotal) * 100)) : 100
            const remaining= Math.max(0, taxTotal - taxPotTotal)
            const potBar   = potPct >= 100 ? '#1D6B35' : potPct >= 60 ? '#9A7B0A' : '#C0392B'

            const today      = new Date()
            const deadline   = new Date(endYear + 1, 0, 31)
            const daysToDue  = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / 86400000))
            const weeksLeft  = Math.max(1, Math.round(daysToDue / 7))
            const weeklyNeed = remaining > 0 ? remaining / weeksLeft : 0
            const daysColor  = daysToDue < 30 ? '#C0392B' : daysToDue < 90 ? '#9A7B0A' : '#0F172A'

            // Build prioritised action list
            const actions: TaxAction[] = []

            if (remaining > 0) {
              actions.push({
                priority: potPct < 60 ? 'red' : 'amber',
                title:    `Save ${formatCurrency(weeklyNeed)} per week to hit your tax target`,
                sub:      `${formatCurrency(remaining)} still to set aside before 31 January ${endYear + 1}`,
                href:     '/tax#tax-pot',
              })
            }

            if (daysToDue <= 60 && daysToDue > 0) {
              actions.push({
                priority: daysToDue <= 30 ? 'red' : 'amber',
                title:    `File Self Assessment in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`,
                sub:      `Deadline: 31 January ${endYear + 1} · Download the SA pack up top`,
                href:     '/tax',
              })
            }

            if (t.kind === 'sole_trader' && t.paAlert) {
              actions.push({
                priority: 'red',
                title:    "You're earning over £100k — Personal Allowance is being tapered",
                sub:      'Pension contributions can reclaim up to 60% effective relief in the taper zone',
                href:     '/settings?tab=Personal+tax+inputs',
              })
            } else if (t.kind === 'sole_trader' && t.higherRateAlert) {
              actions.push({
                priority: 'amber',
                title:    'Some income is taxed at 40%',
                sub:      'Pension contributions can reduce your higher-rate exposure pound-for-pound',
                href:     '/settings?tab=Personal+tax+inputs',
              })
            }

            if (!pageData.hasTaxProfile) {
              actions.push({
                priority: 'info',
                title:    'Complete your tax profile for a precise figure',
                sub:      'Add student loan plan and pension details in Settings → Tax inputs',
                href:     '/settings?tab=Personal+tax+inputs',
              })
            }

            if (actions.length === 0) {
              actions.push({
                priority: 'green',
                title:    "You're on track for January",
                sub:      `Tax pot covers your ${formatCurrency(taxTotal)} liability · ${daysToDue} days until the deadline`,
                href:     '/tax#tax-pot',
              })
            }

            return (
              <>
                <div className="fd-stat-grid" style={{ marginBottom: 0 }}>
                  <StatCard
                    tone="cream"
                    label="Tax owed"
                    value={formatCurrency(taxTotal)}
                    sub={`by 31 January ${endYear + 1}`}
                  />
                  <StatCard
                    label="Set aside"
                    value={formatCurrency(taxPotTotal)}
                    valueColor={potPct >= 100 ? '#1D6B35' : '#0F172A'}
                    progressBar={{ pct: potPct, color: potBar }}
                    sub={
                      remaining > 0
                        ? `${potPct}% of target · ${formatCurrency(remaining)} to go`
                        : "You're fully covered"
                    }
                  />
                  <StatCard
                    label="Take-home"
                    value={formatCurrency(t.takeHome)}
                    sub={`${t.effectiveTaxRate}% effective rate · you keep ${Math.round(100 - t.effectiveTaxRate)}%`}
                  />
                  <StatCard
                    label="Deadline"
                    valueColor={daysColor}
                    value={
                      <>
                        {daysToDue}
                        <span style={{ fontSize: '0.5em', fontWeight: 500, color: '#94A3B8', marginLeft: 6 }}>
                          days
                        </span>
                      </>
                    }
                    sub={`31 January ${endYear + 1}`}
                  />
                </div>

                <NextSteps actions={actions.slice(0, 3)} />
              </>
            )
          })()}

          {/* ── SOLE TRADER ── */}
          {pageData.taxDetail.kind === 'sole_trader' && (() => {
            const t = pageData.taxDetail
            const gap = t.totalTax - (taxPotTotal)
            return (
              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-4">

                  {t.paAlert && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">Personal Allowance is being tapered</p>
                        <p className="text-xs text-red-700 mt-1">Your income exceeds £100,000. You lose £1 of Personal Allowance for every £2 above £100k, creating an effective 60% tax rate between £100,000–£125,140. Pension contributions can reduce this significantly.</p>
                      </div>
                    </div>
                  )}

                  <Card title="Profit & Loss">
                    <Row label="Gross income (ex-VAT)"  value={formatCurrency(t.grossIncome)} />
                    <Row label="Allowable expenses"     value={`−${formatCurrency(t.totalExpenses)}`} red />
                    {pageData.mileageRelief > 0 && (
                      <Row
                        label={`Mileage relief (${pageData.mileageMiles.toLocaleString('en-GB')} mi)`}
                        value={`−${formatCurrency(pageData.mileageRelief)}`}
                        red indent
                        hint="HMRC approved rate · see Expenses → Mileage"
                      />
                    )}
                    {t.pensionContributions > 0 && (
                      <Row label="Pension contributions" value={`−${formatCurrency(t.pensionContributions)}`} red
                        hint={`Tax relief: ${formatCurrency(t.pensionTaxRelief)} (basic rate at source)`} />
                    )}
                    <Row label="Net profit"             value={formatCurrency(t.netProfit)} bold />
                    {t.otherIncome > 0 && (
                      <Row label="Other income" value={formatCurrency(t.otherIncome)} hint="Employment, rental, savings etc." />
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      <a href="/settings?tab=Personal+tax+inputs" className="text-slate-500 hover:underline">Edit in Settings →</a>
                    </p>
                    <Row label={<span>Personal Allowance<InfoTooltip>The amount you can earn each year with no Income Tax — currently £12,570. Reduces by £1 for every £2 you earn over £100,000.</InfoTooltip></span>}     value={`−${formatCurrency(t.personalAllowance)}`}
                      hint={t.paAlert ? 'Reduced — income over £100k' : undefined} />
                    <Row label="Taxable income"         value={formatCurrency(t.taxableIncome)} bold />
                  </Card>

                  <Card title={<span>Income Tax<InfoTooltip>Tax on your personal income above the Personal Allowance (£12,570). Rates: 20% basic, 40% higher, 45% additional.</InfoTooltip></span>}>
                    {t.basicRateTax > 0     && <Row label="Basic rate (20%)"       value={formatCurrency(t.basicRateTax)} indent />}
                    {t.higherRateTax > 0    && <Row label="Higher rate (40%)"      value={formatCurrency(t.higherRateTax)} indent red />}
                    {t.additionalRateTax > 0 && <Row label="Additional rate (45%)" value={formatCurrency(t.additionalRateTax)} indent red />}
                    <Row label="Total Income Tax"        value={formatCurrency(t.incomeTax)} bold />
                  </Card>

                  <Card title="NI & Other Deductions">
                    <Row label={<span>Class 4 NI (6%/2%)<InfoTooltip>National Insurance paid by self-employed people on profits over £12,570. 6% up to £50,270, then 2% above that.</InfoTooltip></span>}   value={formatCurrency(t.classFourNI)}
                      hint="Class 2 NI abolished April 2024" />
                    {t.studentLoanRepayment > 0 && (
                      <Row label="Student loan repayment" value={formatCurrency(t.studentLoanRepayment)} />
                    )}
                    {t.investmentDividendTax > 0 && (
                      <Row label="Investment dividend tax" value={formatCurrency(t.investmentDividendTax)} />
                    )}
                    <Row label="Total deductions"        value={formatCurrency(t.totalTax)} bold />
                  </Card>
                </div>

                <div className="space-y-4" id="tax-pot">
                  <TaxPotCard
                    totalTarget={t.totalTax}
                    totalSaved={taxPotTotal}
                    entries={taxPotEntries}
                    potAmount={potAmount} setPotAmount={setPotAmount}
                    potNote={potNote}     setPotNote={setPotNote}
                    savingPot={savingPot}
                    onAdd={addPotContribution}
                    onDelete={deletePotEntry}
                  />

                  {/* Payments on account */}
                  {t.paymentsOnAccount > 0 && (
                    <Card title={<span>Payments on Account<InfoTooltip>If your tax bill is over £1,000, HMRC asks you to pre-pay half of next year's bill in January and the other half in July. It can feel like a big hit the first time.</InfoTooltip></span>} accent="bg-amber-50">
                      <div className="py-2 text-xs text-amber-700 leading-relaxed">
                        Your tax bill exceeds £1,000 so HMRC requires advance payments. Many freelancers are caught off guard by these.
                      </div>
                      <Row label={`31 Jan ${endYear + 1} (balancing + 1st POA)`} value={formatCurrency(t.totalJanuaryPayment)} bold red />
                      <Row label={`31 Jul ${endYear + 1} (2nd POA)`}              value={formatCurrency(t.julyPayment)} red />
                      <p className="text-xs text-slate-400 py-2 leading-relaxed">
                        Each payment on account = 50% of this year's bill, credited against next year's liability.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            )
          })()}

          {/* ── LIMITED COMPANY ── */}
          {pageData.taxDetail.kind === 'limited_company' && (() => {
            const t = pageData.taxDetail
            return (
              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-4">
                  <Card title="Company — Corporation Tax">
                    <Row label="Gross income (ex-VAT)"       value={formatCurrency(t.grossIncome)} />
                    <Row label="Business expenses"            value={`−${formatCurrency(t.totalExpenses)}`} red />
                    {pageData.mileageRelief > 0 && (
                      <Row
                        label={`Mileage relief (${pageData.mileageMiles.toLocaleString('en-GB')} mi)`}
                        value={`−${formatCurrency(pageData.mileageRelief)}`}
                        red indent
                        hint="HMRC approved rate · see Expenses → Mileage"
                      />
                    )}
                    <Row label="Director salary"              value={`−${formatCurrency(t.salaryDrawn)}`} red />
                    <Row label="Company profit"               value={formatCurrency(t.companyProfit)} bold />
                    <Row label={<span>Corporation Tax ({t.corporationTaxRate}%)<InfoTooltip>Tax your limited company pays on its profits before you take anything out. 19% if profits are £50k or less, 25% if £250k or more.</InfoTooltip></span>} value={formatCurrency(t.corporationTax)} red />
                    <Row label="Profit after corp tax"        value={formatCurrency(t.profitAfterCorpTax)} bold />
                    <Row label={<span>Dividends drawn<InfoTooltip>Dividends you draw from your company are taxed at lower rates than salary. First £500 is free, then 10.75%, 35.75%, or 39.35% depending on your tax band.</InfoTooltip></span>}              value={`−${formatCurrency(t.dividendsDrawn)}`} red />
                    <Row label="Retained in company"          value={formatCurrency(t.retainedProfit)} bold green />
                  </Card>

                  <Card title="Personal — Director Self Assessment">
                    {t.otherIncome > 0 && (
                      <Row label="Other income" value={formatCurrency(t.otherIncome)} hint="Employment, rental, savings etc." />
                    )}
                    <Row label="Salary"                       value={formatCurrency(t.salaryDrawn)} />
                    <Row label="Salary income tax"            value={formatCurrency(t.salaryIncomeTax)} indent red />
                    <Row label={<span>Employee NI (8%)<InfoTooltip>Your personal National Insurance on salary income. 8% on earnings between £12,570 and £50,270, then 2% on anything above.</InfoTooltip></span>}             value={formatCurrency(t.employeeNI)} indent red />
                    <Row label={<span>Employer NI (company cost)<InfoTooltip>National Insurance your company pays on your salary, on top of the salary itself. 13.8% on every £1 over £5,000.</InfoTooltip></span>}   value={formatCurrency(t.employerNI)} indent red />
                    <Row label={<span>Dividends drawn<InfoTooltip>Dividends you draw from your company are taxed at lower rates than salary. First £500 is free, then 10.75%, 35.75%, or 39.35% depending on your tax band.</InfoTooltip></span>}              value={formatCurrency(t.dividendsDrawn)} />
                    <Row label="Dividend allowance (tax-free)" value={`−${formatCurrency(t.dividendAllowance)}`} indent green />
                    <Row label="Dividend tax"                 value={formatCurrency(t.dividendTax)} indent red />
                    {t.studentLoanRepayment > 0 && <Row label="Student loan" value={formatCurrency(t.studentLoanRepayment)} red />}
                    <Row label="Total personal tax"           value={formatCurrency(t.totalPersonalTax)} bold />
                  </Card>
                </div>

                <div className="space-y-4" id="tax-pot">
                  {/* Ltd summary: compact inline stat row — complements KPI row above */}
                  <Card title="Company summary" accent="bg-slate-50">
                    <Row label="Corp tax + employer NI" value={formatCurrency(t.totalCompanyTax)} red />
                    <Row label="Retained in company"    value={formatCurrency(t.retainedProfit)} green bold />
                  </Card>

                  {t.paymentsOnAccount > 0 && (
                    <Card title={<span>Payments on Account<InfoTooltip>If your tax bill is over £1,000, HMRC asks you to pre-pay half of next year's bill in January and the other half in July. It can feel like a big hit the first time.</InfoTooltip></span>} accent="bg-amber-50">
                      <div className="py-2 text-xs text-amber-700">Your SA bill triggers advance payments to HMRC. These figures assume this is your first year of Self Assessment — your January bill will be lower from next year once prior POAs are offset.</div>
                      <Row label={`31 Jan ${endYear + 1}`} value={formatCurrency(t.totalJanuaryPayment)} bold red />
                      <Row label={`31 Jul ${endYear + 1}`} value={formatCurrency(t.julyPayment)} red />
                    </Card>
                  )}

                  <TaxPotCard
                    totalTarget={t.totalPersonalTax}
                    totalSaved={taxPotTotal}
                    entries={taxPotEntries}
                    potAmount={potAmount} setPotAmount={setPotAmount}
                    potNote={potNote}     setPotNote={setPotNote}
                    savingPot={savingPot}
                    onAdd={addPotContribution}
                    onDelete={deletePotEntry}
                  />

                  <Card title="Optimisation note">
                    <div className="py-3 text-xs text-slate-500 space-y-1.5 leading-relaxed">
                      <p>The most tax-efficient structure for a Ltd director is typically:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 ml-1">
                        <li>Salary at the Personal Allowance (£12,570)</li>
                        <li>Remaining income as dividends (10.75% basic rate)</li>
                        <li>Surplus retained in the company (19–25% corp tax)</li>
                        <li>Pension via the company — no NI, and CT-deductible</li>
                      </ul>
                      <p className="text-slate-400 mt-2">Talk to an accountant to optimise your structure.</p>
                    </div>
                  </Card>
                </div>
              </div>
            )
          })()}

          {/* Important dates */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Important dates</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Tax year end',            date: `5 April ${endYear}` },
                { label: 'Paper SA deadline',        date: `31 October ${endYear}` },
                { label: 'Online SA + payment',      date: `31 January ${endYear + 1}` },
                { label: 'Payments on account',      date: `31 July ${endYear + 1}` },
              ].map(d => (
                <div key={d.label}>
                  <p className="text-xs text-slate-400">{d.label}</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{d.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* VAT — only shown for VAT registered users */}
          {pageData.vatRegistered && <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-4">VAT position — {label}</h2>
            {pageData.vatWarning && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pageData.vatWarning}</span>
              </div>
            )}
            <div className="space-y-0 max-w-sm">
              <Row label="VAT collected on invoices"   value={formatCurrency(pageData.totalVatCollected)} />
              <Row label="VAT reclaimable on expenses" value={`−${formatCurrency(pageData.vatReclaimable)}`} green />
              <Row label="Net VAT owed"                value={formatCurrency(pageData.totalVatCollected - pageData.vatReclaimable)} bold />
            </div>
          </div>}

          {/* Paid invoices */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Paid invoices</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pageData.paidInvoices?.length ?? 0} invoices · {formatCurrency(pageData.totalIncomeExVat)} ex-VAT
                </p>
              </div>
              <button onClick={() => exportCSV('income')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            {pageData.paidInvoices?.length ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Invoice','Client','Paid','Ex-VAT','VAT','Total'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 font-medium text-slate-600 ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageData.paidInvoices.map((inv: PaidInvoiceRow) => (
                    <tr key={inv.id} className="fd-table-row">
                      <td className="px-4 py-3 font-medium text-slate-800">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-slate-600">{(Array.isArray(inv.clients) ? inv.clients[0]?.name : inv.clients?.name) ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{inv.paid_date ? new Date(inv.paid_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(inv.total) - Number(inv.vat_amount))}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(inv.vat_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-6 py-8 text-sm text-slate-400 text-center">No paid invoices in this tax year.</p>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Estimates only — based on information you have entered. Confirm all figures with a qualified UK accountant before filing your Self Assessment return.
          </p>
        </>
      )}
    </div>
  )
}
